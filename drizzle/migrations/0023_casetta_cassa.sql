-- Standalone casetta POS ledger. NO prices guessed, NO access keys issued by migration.
-- No changes to donations, cash-request gifts, or other existing tables.
CREATE TABLE IF NOT EXISTS public.casetta_products (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9_-]{2,40}$'),
  label text NOT NULL CHECK (char_length(label) BETWEEN 2 AND 80),
  price_cents integer CHECK (price_cents BETWEEN 1 AND 100000),
  active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  CHECK (NOT active OR price_cents IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.casetta_access_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL CHECK (char_length(label) BETWEEN 2 AND 80),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.casetta_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  access_key_id uuid NOT NULL REFERENCES public.casetta_access_keys(id),
  method text NOT NULL CHECK (method IN ('cash','pos')),
  total_cents integer NOT NULL CHECK (total_cents BETWEEN 1 AND 100000),
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  void_reason text,
  CHECK (voided_at IS NULL OR (void_reason IS NOT NULL AND char_length(void_reason) BETWEEN 5 AND 300))
);
CREATE TABLE IF NOT EXISTS public.casetta_sale_items (
  sale_id uuid NOT NULL REFERENCES public.casetta_sales(id),
  product_id text NOT NULL REFERENCES public.casetta_products(id),
  product_label text NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 200),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents BETWEEN 1 AND 100000),
  line_total_cents integer NOT NULL CHECK (line_total_cents = quantity * unit_price_cents),
  PRIMARY KEY (sale_id,product_id)
);
CREATE TABLE IF NOT EXISTS public.casetta_report_dispatch (
  report_date date NOT NULL,
  audience text NOT NULL CHECK (audience IN ('finance','stock')),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','claimed','accepted','failed','unknown')),
  claim_id uuid,
  claimed_at timestamptz,
  sent_at timestamptz,
  message_id text,
  error_note text,
  PRIMARY KEY (report_date,audience)
);
CREATE INDEX IF NOT EXISTS casetta_sales_created_idx ON public.casetta_sales(created_at);
CREATE INDEX IF NOT EXISTS casetta_access_keys_valid_idx ON public.casetta_access_keys(token_hash) WHERE revoked_at IS NULL;
DO $guard$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['casetta_products','casetta_access_keys','casetta_sales','casetta_sale_items','casetta_report_dispatch'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role',t);
 END LOOP;
END $guard$;

-- Explicitly private service-role-only RPCs. No public/anon grant.
CREATE OR REPLACE FUNCTION public.casetta_catalog(_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Server only' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.casetta_access_keys WHERE token_hash=_token_hash AND revoked_at IS NULL AND expires_at>now()) THEN
  RAISE EXCEPTION 'Accesso cassa non valido' USING ERRCODE='42501';
 END IF;
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'label',label,'priceCents',price_cents) ORDER BY sort_order,label)
  FROM public.casetta_products WHERE active=true AND price_cents IS NOT NULL),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.casetta_record_sale(_token_hash text,_request_id uuid,_method text,_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_key uuid; v_id uuid; v_total integer:=0; v_qty integer:=0;
 v_item jsonb; v_product record; v_product_id text; v_n integer;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Server only' USING ERRCODE='42501';
 END IF;
 SELECT id INTO v_key FROM public.casetta_access_keys
  WHERE token_hash=_token_hash AND revoked_at IS NULL AND expires_at>now();
 IF v_key IS NULL THEN RAISE EXCEPTION 'Accesso cassa scaduto' USING ERRCODE='42501'; END IF;
 IF _method NOT IN ('cash','pos') OR _request_id IS NULL OR jsonb_typeof(_items) IS DISTINCT FROM 'array'
   OR jsonb_array_length(_items) NOT BETWEEN 1 AND 25 THEN RAISE EXCEPTION 'Vendita non valida'; END IF;
 -- Idempotency across duplicate taps, retries and different devices.
 PERFORM pg_advisory_xact_lock(hashtextextended(_request_id::text,7401));
 SELECT id,total_cents INTO v_id,v_total FROM public.casetta_sales WHERE request_id=_request_id;
 IF v_id IS NOT NULL THEN
  RETURN jsonb_build_object('id',v_id,'totalCents',v_total,'alreadyRecorded',true);
 END IF;
 v_total:=0;
 FOR v_item IN SELECT value FROM jsonb_array_elements(_items) LOOP
  IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
   OR jsonb_typeof(v_item->'id') IS DISTINCT FROM 'string'
   OR jsonb_typeof(v_item->'quantity') IS DISTINCT FROM 'number'
   OR (v_item->>'quantity') !~ '^[0-9]{1,3}$'
  THEN RAISE EXCEPTION 'Riga vendita non valida'; END IF;
  v_product_id:=v_item->>'id'; v_n:=(v_item->>'quantity')::integer;
  IF v_n NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Quantità non valida'; END IF;
  SELECT id,label,price_cents INTO v_product FROM public.casetta_products
   WHERE id=v_product_id AND active=true AND price_cents IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prodotto non disponibile'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_items) x
     WHERE x->>'id'=v_product_id
     GROUP BY x->>'id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Prodotto duplicato'; END IF;
  v_total:=v_total+v_product.price_cents*v_n;
  v_qty:=v_qty+v_n;
 END LOOP;
 IF v_total NOT BETWEEN 1 AND 100000 OR v_qty>200 THEN RAISE EXCEPTION 'Importo o quantità fuori limite'; END IF;
 INSERT INTO public.casetta_sales(request_id,access_key_id,method,total_cents)
 VALUES(_request_id,v_key,_method,v_total) RETURNING id INTO v_id;
 INSERT INTO public.casetta_sale_items(sale_id,product_id,product_label,quantity,unit_price_cents,line_total_cents)
 SELECT v_id,p.id,p.label,(x.value->>'quantity')::integer,p.price_cents,p.price_cents*(x.value->>'quantity')::integer
 FROM jsonb_array_elements(_items) x JOIN public.casetta_products p ON p.id=x.value->>'id';
 RETURN jsonb_build_object('id',v_id,'totalCents',v_total,'alreadyRecorded',false);
END $$;

-- Service-only QR issuance; plaintext token is returned ONCE and never persisted.
CREATE OR REPLACE FUNCTION public.casetta_issue_key(_label text,_days integer DEFAULT 45)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_token text;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Server only' USING ERRCODE='42501';
 END IF;
 IF char_length(trim(_label)) NOT BETWEEN 2 AND 80 OR _days NOT BETWEEN 1 AND 90 THEN
  RAISE EXCEPTION 'Parametri QR non validi';
 END IF;
 v_token:=translate(encode(gen_random_bytes(32),'base64'),'+/','-_');
 v_token:=rtrim(v_token,'=');
 INSERT INTO public.casetta_access_keys(label,token_hash,expires_at)
 VALUES(trim(_label),encode(digest(v_token,'sha256'),'hex'),now()+make_interval(days=>_days));
 RETURN v_token;
END $$;

CREATE OR REPLACE FUNCTION public.casetta_daily_report(_day date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_fin jsonb; v_stock jsonb; v_count integer;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Server only' USING ERRCODE='42501';
 END IF;
 SELECT jsonb_build_object('totalCents',COALESCE(sum(total_cents),0),
  'cashCents',COALESCE(sum(total_cents) FILTER(WHERE method='cash'),0),
  'posCents',COALESCE(sum(total_cents) FILTER(WHERE method='pos'),0),
  'transactions',count(*)) INTO v_fin
 FROM public.casetta_sales WHERE (created_at AT TIME ZONE 'Europe/Rome')::date=_day AND voided_at IS NULL;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',product_id,'label',product_label,'quantity',qty,'totalCents',gross) ORDER BY product_label),'[]'::jsonb)
 INTO v_stock FROM (
  SELECT i.product_id,i.product_label,sum(i.quantity)::integer AS qty,sum(i.line_total_cents)::integer AS gross
  FROM public.casetta_sale_items i JOIN public.casetta_sales s ON s.id=i.sale_id
  WHERE (s.created_at AT TIME ZONE 'Europe/Rome')::date=_day AND s.voided_at IS NULL
  GROUP BY i.product_id,i.product_label
 ) a;
 RETURN jsonb_build_object('date',_day,'finance',v_fin,'stock',v_stock);
END $$;

CREATE OR REPLACE FUNCTION public.casetta_claim_report(_day date,_audience text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_claim uuid;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Server only' USING ERRCODE='42501';
 END IF;
 IF _audience NOT IN ('finance','stock') OR _day> (now() AT TIME ZONE 'Europe/Rome')::date
  OR _day < DATE '2026-11-01' THEN RAISE EXCEPTION 'Data report non valida'; END IF;
 INSERT INTO public.casetta_report_dispatch(report_date,audience) VALUES(_day,_audience)
 ON CONFLICT DO NOTHING;
 UPDATE public.casetta_report_dispatch SET state='claimed',claim_id=gen_random_uuid(),claimed_at=now()
 WHERE report_date=_day AND audience=_audience AND state IN ('pending','failed')
 RETURNING claim_id INTO v_claim;
 RETURN v_claim;
END $$;

CREATE OR REPLACE FUNCTION public.casetta_finish_report(_day date,_audience text,_claim uuid,_state text,_message_id text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Server only' USING ERRCODE='42501';
 END IF;
 IF _state NOT IN ('accepted','failed','unknown') THEN RAISE EXCEPTION 'Stato report non valido'; END IF;
 UPDATE public.casetta_report_dispatch
 SET state=_state,sent_at=CASE WHEN _state='accepted' THEN now() ELSE NULL END,message_id=_message_id
 WHERE report_date=_day AND audience=_audience AND claim_id=_claim AND state='claimed';
 RETURN FOUND;
END $$;
DO $guard$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('casetta_catalog','casetta_record_sale','casetta_issue_key','casetta_daily_report','casetta_claim_report','casetta_finish_report') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $guard$;

-- Product labels are examples only; prices remain NULL, every item inactive.
INSERT INTO public.casetta_products(id,label,sort_order) VALUES
 ('panettone','Panettone',10),('pandoro','Pandoro',20),('cioccolatini','Cioccolatini',30),
 ('tisane','Tisane',40),('riso','Riso',50)
ON CONFLICT(id) DO NOTHING;
