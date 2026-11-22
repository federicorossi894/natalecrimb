-- Casetta CRI Monza — extra voluntary donation added to an existing purchase.
-- Keep a single cash/POS payment; only product rows affect physical stock.
-- Existing transactions are preserved with an extra donation of zero.
ALTER TABLE public.casetta_sales
 ADD COLUMN IF NOT EXISTS extra_donation_cents integer NOT NULL DEFAULT 0;
DO $checks$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint
                WHERE conrelid='public.casetta_sales'::regclass
                  AND conname='casetta_sales_extra_donation_range') THEN
  ALTER TABLE public.casetta_sales
   ADD CONSTRAINT casetta_sales_extra_donation_range
   CHECK(extra_donation_cents BETWEEN 0 AND 100000
         AND total_cents > extra_donation_cents);
 END IF;
END $checks$;

-- New eight-argument RPC. Keep seven-argument predecessor alive during deployment
-- so an in-flight old checkout still works with donation=0.
CREATE OR REPLACE FUNCTION public.casetta_record_sale(
 _request_id uuid,_method text,_items jsonb,_email text,_client_tag text,
 _first_name text,_last_name text,_extra_donation_cents integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $sale$
DECLARE v_mode text;v_id uuid;v_products integer:=0;v_count integer:=0;
 v_item jsonb;v_product record;v_pid text;v_qty integer;v_email text;
 v_first text;v_last text;v_stored record;v_total integer;
BEGIN
 IF _request_id IS NULL THEN RAISE EXCEPTION 'ID obbligatorio'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_request_id::text,7401));
 SELECT s.id,s.total_cents,s.mode,s.extra_donation_cents INTO v_stored
 FROM public.casetta_sales s WHERE s.request_id=_request_id;
 IF FOUND THEN
  RETURN jsonb_build_object('id',v_stored.id,'totalCents',v_stored.total_cents,
   'productsCents',v_stored.total_cents-v_stored.extra_donation_cents,
   'extraDonationCents',v_stored.extra_donation_cents,
   'mode',v_stored.mode,'alreadyRecorded',true);
 END IF;
 IF (now() AT TIME ZONE 'Europe/Rome')::time NOT BETWEEN time '08:00' AND time '19:59:59.999999'
 THEN RAISE EXCEPTION 'Cassa chiusa dalle 20 alle 08'; END IF;
 SELECT mode INTO v_mode FROM public.casetta_settings WHERE singleton=true;
 IF v_mode NOT IN('live','test') OR v_mode IS NULL THEN RAISE EXCEPTION 'Cassa non configurata';END IF;
 IF _method IS NULL OR _method NOT IN('cash','pos') OR _items IS NULL
  OR jsonb_typeof(_items) IS DISTINCT FROM 'array'
  OR jsonb_array_length(_items) NOT BETWEEN 1 AND 20
  OR _client_tag IS NULL OR length(_client_tag) NOT BETWEEN 16 AND 128
 THEN RAISE EXCEPTION 'Vendita non valida';END IF;
 IF _extra_donation_cents IS NULL OR _extra_donation_cents NOT BETWEEN 0 AND 100000
 THEN RAISE EXCEPTION 'Donazione extra non valida';END IF;
 IF (SELECT count(*) FROM public.casetta_sales WHERE created_at>now()-interval '1 minute')>=100
 THEN RAISE EXCEPTION 'Cassa temporaneamente occupata';END IF;
 IF (SELECT count(*) FROM public.casetta_sales WHERE client_tag=_client_tag
   AND created_at>now()-interval '1 minute')>=12
 THEN RAISE EXCEPTION 'Troppe operazioni ravvicinate';END IF;
 v_first:=trim(regexp_replace(coalesce(_first_name,''),'[[:space:]]+',' ','g'));
 v_last:=trim(regexp_replace(coalesce(_last_name,''),'[[:space:]]+',' ','g'));
 IF length(v_first) NOT BETWEEN 2 AND 80 OR length(v_last) NOT BETWEEN 2 AND 80
    OR v_first ~ $name$[^[:alpha:]À-ÿ '-]$name$
    OR v_last ~ $name$[^[:alpha:]À-ÿ '-]$name$
 THEN RAISE EXCEPTION 'Nome e cognome obbligatori';END IF;
 v_email:=nullif(lower(trim(coalesce(_email,''))),'');
 IF v_email IS NOT NULL AND (length(v_email)>254 OR v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
 THEN RAISE EXCEPTION 'Email non valida';END IF;
 IF v_email IS NOT NULL AND (SELECT count(*) FROM public.casetta_sales
   WHERE customer_email=v_email AND created_at>now()-interval '1 day')>=4
 THEN RAISE EXCEPTION 'Troppi invii alla stessa email';END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(_items) x(value) LOOP
  IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
   OR jsonb_typeof(v_item->'id') IS DISTINCT FROM 'string'
   OR jsonb_typeof(v_item->'quantity') IS DISTINCT FROM 'number'
   OR (v_item->>'quantity') !~ '^[0-9]{1,2}$'
  THEN RAISE EXCEPTION 'Prodotto o quantità non validi';END IF;
  v_pid:=v_item->>'id'; v_qty:=(v_item->>'quantity')::integer;
  IF v_qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Quantità non valida';END IF;
  SELECT id,label,price_cents INTO v_product
   FROM public.casetta_products WHERE id=v_pid AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prodotto non disponibile';END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(_items) y(value)
      WHERE y.value->>'id'=v_pid)>1
  THEN RAISE EXCEPTION 'Prodotto duplicato';END IF;
  v_products:=v_products+v_product.price_cents*v_qty;
  v_count:=v_count+v_qty;
 END LOOP;
 v_total:=v_products+_extra_donation_cents;
 IF v_products<1 OR v_total>100000 OR v_count>200
 THEN RAISE EXCEPTION 'Importo fuori limite';END IF;
 INSERT INTO public.casetta_sales(
   request_id,mode,method,total_cents,extra_donation_cents,client_tag,
   customer_email,receipt_state,first_name,last_name)
 VALUES(_request_id,v_mode,_method,v_total,_extra_donation_cents,_client_tag,
   v_email,CASE WHEN v_email IS NOT NULL THEN 'pending' ELSE 'none' END,
   v_first,v_last)
 RETURNING id INTO v_id;
 INSERT INTO public.casetta_sale_items(
   sale_id,product_id,product_label,quantity,unit_price_cents,line_total_cents)
 SELECT v_id,p.id,p.label,(x.value->>'quantity')::integer,p.price_cents,
        p.price_cents*(x.value->>'quantity')::integer
 FROM jsonb_array_elements(_items) x(value)
 JOIN public.casetta_products p ON p.id=x.value->>'id';
 RETURN jsonb_build_object('id',v_id,'totalCents',v_total,
  'productsCents',v_products,'extraDonationCents',_extra_donation_cents,
  'mode',v_mode,'alreadyRecorded',false);
END $sale$;

CREATE OR REPLACE FUNCTION public.casetta_claim_receipts(_limit integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $receipt$
DECLARE v_result jsonb;
BEGIN
 WITH picked AS (
  SELECT id FROM public.casetta_sales WHERE mode IN('live','test')
    AND receipt_state IN('pending','failed')
  ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT least(greatest(_limit,1),10)
 ),claimed AS (
  UPDATE public.casetta_sales s
   SET receipt_state='claimed',receipt_claim=gen_random_uuid()
  FROM picked p WHERE s.id=p.id
  RETURNING s.id,s.receipt_claim,s.customer_email,s.total_cents,
    s.extra_donation_cents,s.created_at,s.first_name,s.mode
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'claim',receipt_claim,'email',customer_email,'mode',mode,
  'firstName',coalesce(first_name,''),'totalCents',total_cents,
  'productsCents',total_cents-extra_donation_cents,
  'extraDonationCents',extra_donation_cents,'createdAt',created_at,
  'items',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'label',i.product_label,'quantity',i.quantity,'totalCents',i.line_total_cents)
    ORDER BY i.product_label),'[]'::jsonb)
   FROM public.casetta_sale_items i WHERE i.sale_id=claimed.id))),'[]'::jsonb)
 INTO v_result FROM claimed;
 RETURN v_result;
END $receipt$;

-- Keep the existing historical pre-use wrapper and add finance breakdown.
CREATE OR REPLACE FUNCTION public.casetta_daily_report(_day date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $report$
DECLARE b jsonb;pre_amount bigint;pre_units integer;pre_groups integer;
 new_stock jsonb;new_daily jsonb;v_extra bigint;v_cumulative_extra bigint;
BEGIN
 b:=public.casetta_daily_report_base(_day);
 SELECT coalesce(sum(total_cents),0),coalesce(sum(quantity),0)::integer,count(*)::integer
 INTO pre_amount,pre_units,pre_groups
 FROM public.casetta_preuse_sales WHERE sale_day=_day;
 SELECT coalesce(sum(extra_donation_cents),0) INTO v_extra
 FROM public.casetta_sales WHERE mode='live'
   AND (created_at AT TIME ZONE 'Europe/Rome')::date=_day;
 SELECT coalesce(sum(extra_donation_cents),0) INTO v_cumulative_extra
 FROM public.casetta_sales WHERE mode='live'
   AND (created_at AT TIME ZONE 'Europe/Rome')::date<=_day;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',id,'label',label,'quantity',qty,'totalCents',amount) ORDER BY label),'[]'::jsonb)
 INTO new_stock FROM (
  SELECT id,label,sum(quantity)::integer qty,sum(amount)::integer amount FROM (
   SELECT id,label,quantity,"totalCents" amount
   FROM jsonb_to_recordset(b->'stock')
    AS r(id text,label text,quantity integer,"totalCents" integer)
   UNION ALL
   SELECT h.product_id,p.label,h.quantity,h.total_cents
   FROM public.casetta_preuse_sales h JOIN public.casetta_products p ON p.id=h.product_id
   WHERE h.sale_day=_day
  ) all_products GROUP BY id,label
 ) totals;
 SELECT coalesce(jsonb_agg(
   jsonb_set(d.value,'{date}',to_jsonb(left(d.value->>'date',10)))
   || jsonb_build_object('totalCents',(d.value->>'totalCents')::bigint+
    coalesce((SELECT sum(h.total_cents) FROM public.casetta_preuse_sales h
       WHERE h.sale_day=(d.value->>'date')::date),0))
   ORDER BY d.value->>'date'),'[]'::jsonb)
 INTO new_daily FROM jsonb_array_elements(b->'daily') d(value);
 RETURN b||jsonb_build_object(
  'finance',(b->'finance')||jsonb_build_object(
   'totalCents',(b->'finance'->>'totalCents')::bigint+pre_amount,
   'productsCents',(b->'finance'->>'totalCents')::bigint+pre_amount-v_extra,
   'extraDonationCents',v_extra,
   'preUseCents',pre_amount,'unallocatedCents',pre_amount,
   'preUseUnits',pre_units,'preUseGroups',pre_groups),
  'cumulativeExtraDonationCents',v_cumulative_extra,
  'cumulativeCents',(b->>'cumulativeCents')::bigint+
    (SELECT coalesce(sum(total_cents),0) FROM public.casetta_preuse_sales
     WHERE sale_day<=_day),
  'stock',new_stock,'daily',new_daily);
 -- Hourly gross includes the donation: it is part of the actual payment.
END $report$;

-- LIVE export rows: both the physical goods subtotal and the optional donation.
-- The historical-paper wrapper remains unchanged and labels those rows separately.
CREATE OR REPLACE FUNCTION public.casetta_export_sales_base(_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $export$
DECLARE v_day date;v_rows jsonb;v_products jsonb;
BEGIN
 SELECT report_date INTO v_day FROM public.casetta_export_tokens
 WHERE token_hash=_token_hash AND expires_at>now() AND revoked_at IS NULL;
 IF v_day IS NULL THEN RETURN NULL;END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label)
    ORDER BY sort_order,id),'[]'::jsonb)
 INTO v_products FROM public.casetta_products;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'date',to_char(s.created_at AT TIME ZONE 'Europe/Rome','DD/MM/YYYY HH24:MI'),
   'firstName',coalesce(s.first_name,''),'lastName',coalesce(s.last_name,''),
   'amountCents',s.total_cents,
   'productsCents',s.total_cents-s.extra_donation_cents,
   'extraDonationCents',s.extra_donation_cents,
   'method',s.method,
   'quantities',coalesce((SELECT jsonb_object_agg(i.product_id,i.quantity)
      FROM public.casetta_sale_items i WHERE i.sale_id=s.id),'{}'::jsonb))
   ORDER BY s.created_at,s.id),'[]'::jsonb)
 INTO v_rows FROM public.casetta_sales s
 WHERE s.mode='live' AND (s.created_at AT TIME ZONE 'Europe/Rome')::date<=v_day;
 RETURN jsonb_build_object('date',v_day,'products',v_products,'rows',v_rows);
END $export$;

DO $grants$ DECLARE f record;BEGIN
 FOR f IN SELECT p.oid::regprocedure signature
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN (
   'casetta_record_sale','casetta_claim_receipts','casetta_daily_report',
   'casetta_export_sales_base') LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $grants$;