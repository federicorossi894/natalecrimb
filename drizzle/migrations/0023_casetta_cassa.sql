-- CRI Monza Casetta: open public kiosk 08:00–20:00 Europe/Rome.
-- Isolated from existing donations, online payments, mail and volunteers.
-- Test mode is the default: test sales never count toward finance or send emails.
CREATE TABLE IF NOT EXISTS public.casetta_products (
 id text PRIMARY KEY CHECK(id ~ '^[a-z0-9_-]{2,40}$'),
 label text NOT NULL CHECK(length(label) BETWEEN 2 AND 80),
 price_cents integer NOT NULL CHECK(price_cents BETWEEN 1 AND 100000),
 sort_order integer NOT NULL DEFAULT 0,
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.casetta_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 mode text NOT NULL DEFAULT 'test' CHECK(mode IN ('test','live'))
);
INSERT INTO public.casetta_settings(singleton,mode) VALUES(true,'test') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.casetta_sales (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL UNIQUE,
 mode text NOT NULL CHECK(mode IN ('test','live')),
 method text NOT NULL CHECK(method IN ('cash','pos')),
 total_cents integer NOT NULL CHECK(total_cents BETWEEN 1 AND 100000),
 client_tag text NOT NULL CHECK(length(client_tag) BETWEEN 16 AND 128),
 customer_email text CHECK(customer_email IS NULL OR length(customer_email) <= 254),
 receipt_state text NOT NULL DEFAULT 'none' CHECK(receipt_state IN ('none','pending','claimed','accepted','failed','unknown')),
 receipt_claim uuid,
 receipt_message_id text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.casetta_sale_items (
 sale_id uuid NOT NULL REFERENCES public.casetta_sales(id),
 product_id text NOT NULL REFERENCES public.casetta_products(id),
 product_label text NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99),
 unit_price_cents integer NOT NULL CHECK(unit_price_cents BETWEEN 1 AND 100000),
 line_total_cents integer NOT NULL CHECK(line_total_cents=quantity*unit_price_cents),
 PRIMARY KEY(sale_id,product_id)
);
CREATE TABLE IF NOT EXISTS public.casetta_report_dispatch (
 report_date date NOT NULL,
 audience text NOT NULL CHECK(audience IN ('finance','stock')),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','claimed','accepted','failed','unknown')),
 claim_id uuid,
 claimed_at timestamptz,
 sent_at timestamptz,
 message_id text,
 PRIMARY KEY(report_date,audience)
);
CREATE INDEX IF NOT EXISTS casetta_sales_time_idx ON public.casetta_sales(created_at,mode);
CREATE INDEX IF NOT EXISTS casetta_sales_client_idx ON public.casetta_sales(client_tag,created_at);
CREATE INDEX IF NOT EXISTS casetta_sales_receipts_idx ON public.casetta_sales(receipt_state) WHERE receipt_state IN ('pending','failed');

DO $guard$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['casetta_products','casetta_settings','casetta_sales','casetta_sale_items','casetta_report_dispatch'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role',t);
 END LOOP;
END $guard$;

CREATE OR REPLACE FUNCTION public.casetta_catalog()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_mode text; v_clock time;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 SELECT mode INTO v_mode FROM public.casetta_settings WHERE singleton=true;
 v_clock:=(now() AT TIME ZONE 'Europe/Rome')::time;
 RETURN jsonb_build_object(
  'mode',v_mode,'open',(v_clock>=time '08:00' AND v_clock<time '20:00'),
  'products',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'label',label,'priceCents',price_cents)
     ORDER BY sort_order,id) FROM public.casetta_products WHERE active),'[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.casetta_record_sale(
 _request_id uuid,_method text,_items jsonb,_email text,_client_tag text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_mode text; v_id uuid; v_total integer:=0; v_count integer:=0;
 v_item jsonb; v_product record; v_pid text; v_qty integer; v_email text;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 IF _request_id IS NULL THEN RAISE EXCEPTION 'ID obbligatorio'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_request_id::text,7401));
 SELECT id,total_cents,mode INTO v_id,v_total,v_mode FROM public.casetta_sales WHERE request_id=_request_id;
 IF FOUND THEN RETURN jsonb_build_object('id',v_id,'totalCents',v_total,'mode',v_mode,'alreadyRecorded',true); END IF;
 IF (now() AT TIME ZONE 'Europe/Rome')::time NOT BETWEEN time '08:00' AND time '19:59:59.999999'
 THEN RAISE EXCEPTION 'Cassa chiusa dalle 20 alle 08'; END IF;
 SELECT mode INTO v_mode FROM public.casetta_settings WHERE singleton=true;
 IF v_mode IS NULL THEN RAISE EXCEPTION 'Cassa non configurata'; END IF;
 IF _method IS NULL OR _method NOT IN ('cash','pos') OR _items IS NULL
  OR jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 20
  OR _client_tag IS NULL OR length(_client_tag) NOT BETWEEN 16 AND 128
 THEN RAISE EXCEPTION 'Vendita non valida'; END IF;
 -- Public kiosk: global and per-device limits reduce (but do not eliminate) anonymous abuse.
 IF (SELECT count(*) FROM public.casetta_sales WHERE created_at>now()-interval '1 minute')>=100
 THEN RAISE EXCEPTION 'Cassa temporaneamente occupata'; END IF;
 IF (SELECT count(*) FROM public.casetta_sales WHERE client_tag=_client_tag AND created_at>now()-interval '1 minute')>=12
 THEN RAISE EXCEPTION 'Troppe operazioni ravvicinate'; END IF;
 v_email:=nullif(lower(trim(coalesce(_email,''))),'');
 IF v_email IS NOT NULL AND (length(v_email)>254 OR v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
 THEN RAISE EXCEPTION 'Email non valida'; END IF;
 IF v_email IS NOT NULL AND (SELECT count(*) FROM public.casetta_sales
   WHERE customer_email=v_email AND mode='live' AND created_at>now()-interval '1 day')>=4
 THEN RAISE EXCEPTION 'Troppi invii alla stessa email'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(_items) AS x(value) LOOP
  IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_item->'id') IS DISTINCT FROM 'string'
    OR jsonb_typeof(v_item->'quantity') IS DISTINCT FROM 'number'
    OR (v_item->>'quantity') !~ '^[0-9]{1,2}$'
  THEN RAISE EXCEPTION 'Prodotto o quantità non validi'; END IF;
  v_pid:=v_item->>'id'; v_qty:=(v_item->>'quantity')::integer;
  IF v_qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Quantità non valida'; END IF;
  SELECT id,label,price_cents INTO v_product FROM public.casetta_products WHERE id=v_pid AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prodotto non disponibile'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(_items) AS y(value) WHERE y.value->>'id'=v_pid)>1
  THEN RAISE EXCEPTION 'Prodotto duplicato'; END IF;
  v_total:=v_total+v_product.price_cents*v_qty;
  v_count:=v_count+v_qty;
 END LOOP;
 IF v_total NOT BETWEEN 1 AND 100000 OR v_count>200 THEN RAISE EXCEPTION 'Importo fuori limite'; END IF;
 INSERT INTO public.casetta_sales(request_id,mode,method,total_cents,client_tag,customer_email,receipt_state)
 VALUES(_request_id,v_mode,_method,v_total,_client_tag,
  CASE WHEN v_mode='live' THEN v_email ELSE NULL END,
  CASE WHEN v_mode='live' AND v_email IS NOT NULL THEN 'pending' ELSE 'none' END)
 RETURNING id INTO v_id;
 INSERT INTO public.casetta_sale_items(sale_id,product_id,product_label,quantity,unit_price_cents,line_total_cents)
 SELECT v_id,p.id,p.label,(x.value->>'quantity')::integer,p.price_cents,
  p.price_cents*(x.value->>'quantity')::integer
 FROM jsonb_array_elements(_items) AS x(value) JOIN public.casetta_products p ON p.id=x.value->>'id';
 RETURN jsonb_build_object('id',v_id,'totalCents',v_total,'mode',v_mode,'alreadyRecorded',false);
END $$;

CREATE OR REPLACE FUNCTION public.casetta_daily_report(_day date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_fin jsonb; v_stock jsonb; v_hourly jsonb; v_daily jsonb; v_cumulative bigint;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('totalCents',coalesce(sum(total_cents),0),
   'cashCents',coalesce(sum(total_cents) FILTER(WHERE method='cash'),0),
   'posCents',coalesce(sum(total_cents) FILTER(WHERE method='pos'),0),'transactions',count(*))
 INTO v_fin FROM public.casetta_sales WHERE mode='live'
   AND (created_at AT TIME ZONE 'Europe/Rome')::date=_day;
 SELECT coalesce(sum(total_cents),0) INTO v_cumulative FROM public.casetta_sales WHERE mode='live';
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',product_id,'label',product_label,'quantity',qty,'totalCents',gross)
   ORDER BY product_label),'[]'::jsonb) INTO v_stock FROM (
  SELECT i.product_id,i.product_label,sum(i.quantity)::integer qty,sum(i.line_total_cents)::integer gross
  FROM public.casetta_sale_items i JOIN public.casetta_sales s ON s.id=i.sale_id
  WHERE s.mode='live' AND (s.created_at AT TIME ZONE 'Europe/Rome')::date=_day
  GROUP BY i.product_id,i.product_label) a;
 WITH days AS (
  SELECT (s.created_at AT TIME ZONE 'Europe/Rome')::date d,
   extract(hour FROM s.created_at AT TIME ZONE 'Europe/Rome')::int h,
   sum(s.total_cents)::bigint total
  FROM public.casetta_sales s WHERE s.mode='live' AND (s.created_at AT TIME ZONE 'Europe/Rome')::date<=_day
  GROUP BY 1,2
 ), historical AS (
  SELECT h,round(sum(total)::numeric / greatest(
    (SELECT count(DISTINCT d) FROM days WHERE d<_day),1))::bigint avg_cents
  FROM days WHERE d<_day GROUP BY h
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object('hour',hours.h,
   'todayCents',coalesce((SELECT total FROM days WHERE d=_day AND h=hours.h),0),
   'averageCents',coalesce(hist.avg_cents,0)) ORDER BY hours.h),'[]'::jsonb)
 INTO v_hourly FROM generate_series(8,19) AS hours(h)
 LEFT JOIN historical hist ON hist.h=hours.h;
 SELECT coalesce(jsonb_agg(jsonb_build_object('date',d::text,'totalCents',
   coalesce((SELECT sum(s.total_cents) FROM public.casetta_sales s WHERE s.mode='live'
     AND (s.created_at AT TIME ZONE 'Europe/Rome')::date=d),0)) ORDER BY d),'[]'::jsonb)
 INTO v_daily FROM generate_series(_day-6,_day,interval '1 day') AS dates(d);
 RETURN jsonb_build_object('date',_day,'finance',v_fin,'cumulativeCents',v_cumulative,
   'stock',v_stock,'hourly',v_hourly,'daily',v_daily);
END $$;

CREATE OR REPLACE FUNCTION public.casetta_claim_report(_day date,_audience text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_claim uuid;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 IF _audience NOT IN ('finance','stock') OR _day<>(now() AT TIME ZONE 'Europe/Rome')::date
   OR (now() AT TIME ZONE 'Europe/Rome')::time<time '20:00'
 THEN RAISE EXCEPTION 'Report consentito solo dopo le 20'; END IF;
 INSERT INTO public.casetta_report_dispatch(report_date,audience) VALUES(_day,_audience)
 ON CONFLICT DO NOTHING;
 UPDATE public.casetta_report_dispatch SET state='claimed',claim_id=gen_random_uuid(),claimed_at=now()
 WHERE report_date=_day AND audience=_audience AND state IN ('pending','failed')
 RETURNING claim_id INTO v_claim;
 RETURN v_claim;
END $$;

CREATE OR REPLACE FUNCTION public.casetta_finish_report(
 _day date,_audience text,_claim uuid,_state text,_message_id text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 IF _state NOT IN ('accepted','failed','unknown') THEN RAISE EXCEPTION 'Stato non valido'; END IF;
 UPDATE public.casetta_report_dispatch SET state=_state,
  sent_at=CASE WHEN _state='accepted' THEN now() ELSE NULL END,message_id=_message_id
 WHERE report_date=_day AND audience=_audience AND claim_id=_claim AND state='claimed';
 RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.casetta_claim_receipts(_limit integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_result jsonb;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 WITH picked AS (
  SELECT id FROM public.casetta_sales WHERE mode='live' AND receipt_state IN ('pending','failed')
   ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT least(greatest(_limit,1),10)
 ), claimed AS (
  UPDATE public.casetta_sales s SET receipt_state='claimed',receipt_claim=gen_random_uuid()
  FROM picked p WHERE s.id=p.id
  RETURNING s.id,s.receipt_claim,s.customer_email,s.total_cents,s.created_at
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'claim',receipt_claim,
   'email',customer_email,'totalCents',total_cents,'createdAt',created_at,
   'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('label',i.product_label,'quantity',i.quantity,
     'totalCents',i.line_total_cents) ORDER BY i.product_label),'[]'::jsonb)
     FROM public.casetta_sale_items i WHERE i.sale_id=claimed.id))),'[]'::jsonb)
 INTO v_result FROM claimed;
 RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.casetta_finish_receipt(
 _id uuid,_claim uuid,_state text,_message_id text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 IF _state NOT IN ('accepted','failed','unknown') THEN RAISE EXCEPTION 'Stato non valido'; END IF;
 UPDATE public.casetta_sales SET receipt_state=_state,receipt_message_id=_message_id
 WHERE id=_id AND receipt_claim=_claim AND receipt_state='claimed';
 RETURN FOUND;
END $$;

DO $guard$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('casetta_catalog','casetta_record_sale','casetta_daily_report',
 'casetta_claim_report','casetta_finish_report','casetta_claim_receipts','casetta_finish_receipt') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $guard$;

-- Listino 22 novembre 2026, as supplied. Separate SKU for 500g and 1kg rice.
INSERT INTO public.casetta_products(id,label,price_cents,sort_order) VALUES
 ('panettone_cartone','Panettone cartone',1400,10),
 ('latta_panettone_pandoro','Panettone / Pandoro latta',1600,20),
 ('cioccolatini','Cioccolatini',800,30),
 ('tisane_etiche','Tisane etiche',500,40),
 ('riso_500','Riso 500 g',500,50),
 ('riso_1000','Riso 1 kg',800,60),
 ('the_verde_rosso','Tè verde / rosso',500,70),
 ('bastoncino_zucchero','Bastoncino di zucchero',300,80)
ON CONFLICT(id) DO UPDATE SET label=EXCLUDED.label,price_cents=EXCLUDED.price_cents,
 sort_order=EXCLUDED.sort_order;
