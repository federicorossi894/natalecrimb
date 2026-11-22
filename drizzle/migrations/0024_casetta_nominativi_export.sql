-- Casetta v2: names on each sale, opt-in customer mail, expiring private XLSX links.
-- Existing historical test rows may have no name; all new sales require both.
ALTER TABLE public.casetta_sales
 ADD COLUMN IF NOT EXISTS first_name text,
 ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.casetta_sales
 ADD CONSTRAINT casetta_first_name_size CHECK(first_name IS NULL OR length(first_name) BETWEEN 2 AND 80),
 ADD CONSTRAINT casetta_last_name_size CHECK(last_name IS NULL OR length(last_name) BETWEEN 2 AND 80);

CREATE TABLE IF NOT EXISTS public.casetta_export_tokens(
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 report_date date NOT NULL,
 audience text NOT NULL CHECK(audience IN ('finance','stock')),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS casetta_export_expiry_idx ON public.casetta_export_tokens(expires_at);
ALTER TABLE public.casetta_export_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.casetta_export_tokens FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.casetta_export_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.casetta_record_sale(
 _request_id uuid,_method text,_items jsonb,_email text,_client_tag text,
 _first_name text,_last_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_mode text; v_id uuid; v_total integer:=0; v_count integer:=0;
 v_item jsonb; v_product record; v_pid text; v_qty integer; v_email text;
 v_first text; v_last text;
BEGIN
 -- Access controlled by REVOKE/GRANT and SECURITY INVOKER, not JWT claim text.
 IF _request_id IS NULL THEN RAISE EXCEPTION 'ID obbligatorio'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_request_id::text,7401));
 SELECT id,total_cents,mode INTO v_id,v_total,v_mode FROM public.casetta_sales WHERE request_id=_request_id;
 IF FOUND THEN RETURN jsonb_build_object('id',v_id,'totalCents',v_total,'mode',v_mode,'alreadyRecorded',true); END IF;
 v_total:=0;
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
 v_first:=trim(regexp_replace(coalesce(_first_name,''),'[[:space:]]+',' ','g'));
 v_last:=trim(regexp_replace(coalesce(_last_name,''),'[[:space:]]+',' ','g'));
 IF length(v_first) NOT BETWEEN 2 AND 80 OR length(v_last) NOT BETWEEN 2 AND 80
    OR v_first ~ $name$[^[:alpha:]À-ÿ '-]$name$
    OR v_last ~ $name$[^[:alpha:]À-ÿ '-]$name$
 THEN RAISE EXCEPTION 'Nome e cognome obbligatori'; END IF;
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
 INSERT INTO public.casetta_sales(request_id,mode,method,total_cents,client_tag,customer_email,receipt_state,first_name,last_name)
 VALUES(_request_id,v_mode,_method,v_total,_client_tag,
  CASE WHEN v_mode='live' THEN v_email ELSE NULL END,
  CASE WHEN v_mode='live' AND v_email IS NOT NULL THEN 'pending' ELSE 'none' END,
 v_first,v_last)
 RETURNING id INTO v_id;
 INSERT INTO public.casetta_sale_items(sale_id,product_id,product_label,quantity,unit_price_cents,line_total_cents)
 SELECT v_id,p.id,p.label,(x.value->>'quantity')::integer,p.price_cents,
  p.price_cents*(x.value->>'quantity')::integer
 FROM jsonb_array_elements(_items) AS x(value) JOIN public.casetta_products p ON p.id=x.value->>'id';
 RETURN jsonb_build_object('id',v_id,'totalCents',v_total,'mode',v_mode,'alreadyRecorded',false);
END $$;

-- Server-generated 256-bit random token is stored ONLY as a SHA-256 hash.
-- Each email gets a separate link, expiring after 7 days.
CREATE OR REPLACE FUNCTION public.casetta_create_export(
 _token_hash text,_day date,_audience text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF _token_hash !~ '^[a-f0-9]{64}$'
   OR _audience NOT IN ('finance','stock')
   OR _day<>(now() AT TIME ZONE 'Europe/Rome')::date
   OR (now() AT TIME ZONE 'Europe/Rome')::time<time '20:00'
   OR (SELECT mode FROM public.casetta_settings WHERE singleton=true)<>'live'
 THEN RAISE EXCEPTION 'Export non consentito'; END IF;
 INSERT INTO public.casetta_export_tokens(token_hash,report_date,audience,expires_at)
 VALUES(_token_hash,_day,_audience,now()+interval '7 days');
 RETURN true;
END $$;

-- Only an unexpired, non-revoked token hash can fetch personal data.
-- Returns every live sale through the requested report day, with product quantities.
CREATE OR REPLACE FUNCTION public.casetta_export_sales(_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_day date;v_rows jsonb;v_products jsonb;
BEGIN
 SELECT report_date INTO v_day FROM public.casetta_export_tokens
 WHERE token_hash=_token_hash AND expires_at>now() AND revoked_at IS NULL;
 IF v_day IS NULL THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label) ORDER BY sort_order,id),'[]'::jsonb)
 INTO v_products FROM public.casetta_products;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'date',to_char(s.created_at AT TIME ZONE 'Europe/Rome','DD/MM/YYYY HH24:MI'),
  'firstName',coalesce(s.first_name,''),'lastName',coalesce(s.last_name,''),
  'amountCents',s.total_cents,'method',s.method,
  'quantities',coalesce((SELECT jsonb_object_agg(i.product_id,i.quantity)
   FROM public.casetta_sale_items i WHERE i.sale_id=s.id),'{}'::jsonb))
  ORDER BY s.created_at,s.id),'[]'::jsonb)
 INTO v_rows FROM public.casetta_sales s
 WHERE s.mode='live' AND (s.created_at AT TIME ZONE 'Europe/Rome')::date<=v_day;
 RETURN jsonb_build_object('date',v_day,'products',v_products,'rows',v_rows);
END $$;

REVOKE ALL ON FUNCTION public.casetta_record_sale(uuid,text,jsonb,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.casetta_record_sale(uuid,text,jsonb,text,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.casetta_create_export(text,date,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.casetta_create_export(text,date,text) TO service_role;
REVOKE ALL ON FUNCTION public.casetta_export_sales(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.casetta_export_sales(text) TO service_role;
-- Old 5-argument RPC must not be used to bypass mandatory names.
REVOKE EXECUTE ON FUNCTION public.casetta_record_sale(uuid,text,jsonb,text,text) FROM service_role;

-- Personalize opt-in receipts with the customer's first name.
CREATE OR REPLACE FUNCTION public.casetta_claim_receipts(_limit integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_result jsonb;
BEGIN
 -- Access controlled by REVOKE/GRANT and SECURITY INVOKER, not JWT claim text.
 WITH picked AS (
  SELECT id FROM public.casetta_sales WHERE mode='live' AND receipt_state IN ('pending','failed')
   ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT least(greatest(_limit,1),10)
 ), claimed AS (
  UPDATE public.casetta_sales s SET receipt_state='claimed',receipt_claim=gen_random_uuid()
  FROM picked p WHERE s.id=p.id
  RETURNING s.id,s.receipt_claim,s.customer_email,s.total_cents,s.created_at,s.first_name
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'claim',receipt_claim,
   'email',customer_email,'firstName',coalesce(first_name,''),'totalCents',total_cents,'createdAt',created_at,
   'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('label',i.product_label,'quantity',i.quantity,
     'totalCents',i.line_total_cents) ORDER BY i.product_label),'[]'::jsonb)
     FROM public.casetta_sale_items i WHERE i.sale_id=claimed.id))),'[]'::jsonb)
 INTO v_result FROM claimed;
 RETURN v_result;
END $$;

