-- Compose existing LIVE reporting with historic pre-use totals.
-- Keep old tried-and-tested implementations as _base procedures.
DO $rename$ BEGIN
 IF to_regprocedure('public.casetta_daily_report_base(date)') IS NULL THEN
  EXECUTE 'ALTER FUNCTION public.casetta_daily_report(date) RENAME TO casetta_daily_report_base';
 END IF;
 IF to_regprocedure('public.casetta_inventory_snapshot_base(date)') IS NULL THEN
  EXECUTE 'ALTER FUNCTION public.casetta_inventory_snapshot(date) RENAME TO casetta_inventory_snapshot_base';
 END IF;
 IF to_regprocedure('public.casetta_export_sales_base(text)') IS NULL THEN
  EXECUTE 'ALTER FUNCTION public.casetta_export_sales(text) RENAME TO casetta_export_sales_base';
 END IF;
END $rename$;

CREATE OR REPLACE FUNCTION public.casetta_daily_report(_day date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $body$
DECLARE b jsonb;pre_amount bigint;pre_units integer;pre_groups integer;new_stock jsonb;new_daily jsonb;
BEGIN
 b:=public.casetta_daily_report_base(_day);
 SELECT coalesce(sum(total_cents),0),coalesce(sum(quantity),0)::integer,count(*)::integer
 INTO pre_amount,pre_units,pre_groups
 FROM public.casetta_preuse_sales WHERE sale_day=_day;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label,
   'quantity',qty,'totalCents',amount) ORDER BY label),'[]'::jsonb)
 INTO new_stock FROM (
  SELECT id,label,sum(quantity)::integer qty,sum(amount)::integer amount FROM (
   SELECT id,label,quantity,"totalCents" amount
   FROM jsonb_to_recordset(b->'stock')
       AS r(id text,label text,quantity integer,"totalCents" integer)
   UNION ALL
   SELECT h.product_id,p.label,h.quantity,h.total_cents
   FROM public.casetta_preuse_sales h JOIN public.casetta_products p ON p.id=h.product_id
   WHERE h.sale_day=_day
  ) mixed GROUP BY id,label
 ) grouped;
 SELECT coalesce(jsonb_agg(
   jsonb_set(d.value,'{date}',to_jsonb(left(d.value->>'date',10))) || jsonb_build_object('totalCents',(d.value->>'totalCents')::bigint+
    coalesce((SELECT sum(h.total_cents) FROM public.casetta_preuse_sales h
      WHERE h.sale_day=(d.value->>'date')::date),0))
   ORDER BY d.value->>'date'),'[]'::jsonb)
 INTO new_daily FROM jsonb_array_elements(b->'daily') d(value);
 RETURN b || jsonb_build_object(
  'finance',(b->'finance')||jsonb_build_object(
   'totalCents',(b->'finance'->>'totalCents')::bigint+pre_amount,
   'preUseCents',pre_amount,'unallocatedCents',pre_amount,
   'preUseUnits',pre_units,'preUseGroups',pre_groups),
  'cumulativeCents',(b->>'cumulativeCents')::bigint+
   (SELECT coalesce(sum(total_cents),0) FROM public.casetta_preuse_sales WHERE sale_day<=_day),
  'stock',new_stock,'daily',new_daily);
 -- Hourly remains LIVE-only: the paper sheet has no individual sale times.
END $body$;

CREATE OR REPLACE FUNCTION public.casetta_inventory_snapshot(_day date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $body$
DECLARE b jsonb;result jsonb;
BEGIN
 b:=public.casetta_inventory_snapshot_base(_day);
 SELECT coalesce(jsonb_agg(o.value||jsonb_build_object(
  'soldToday',(o.value->>'soldToday')::integer+h.today_qty,
  'preUseSoldToday',h.today_qty,'preUsePending',h.pending_qty,
  'availableQty',CASE WHEN o.value->>'availableQty' IS NULL THEN NULL
    ELSE (o.value->>'availableQty')::integer-h.applied_qty END,
  'status',CASE
    WHEN o.value->>'availableQty' IS NULL THEN 'unknown'
    WHEN (o.value->>'availableQty')::integer-h.applied_qty<=0 THEN 'out'
    WHEN (o.value->>'availableQty')::integer-h.applied_qty<=(o.value->>'thresholdQty')::integer THEN 'low'
    ELSE 'ok' END) ORDER BY o.ord),'[]'::jsonb)
 INTO result
 FROM jsonb_array_elements(b) WITH ORDINALITY o(value,ord)
 LEFT JOIN LATERAL(
  SELECT coalesce(sum(quantity) FILTER(WHERE sale_day=_day),0)::integer today_qty,
    coalesce(sum(quantity) FILTER(WHERE sale_day<=_day AND stock_reconciliation='pending'),0)::integer pending_qty,
    coalesce(sum(quantity) FILTER(WHERE sale_day<=_day AND stock_reconciliation='apply_to_opening'),0)::integer applied_qty
  FROM public.casetta_preuse_sales h WHERE h.product_id=o.value->>'id'
 ) h ON true;
 RETURN result;
END $body$;

CREATE OR REPLACE FUNCTION public.casetta_export_sales(_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $body$
DECLARE b jsonb;d date;pre_rows jsonb;
BEGIN
 b:=public.casetta_export_sales_base(_token_hash);
 IF b IS NULL THEN RETURN NULL;END IF;
 d:=(b->>'date')::date;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'date',to_char(h.sale_day,'DD/MM/YYYY'),'firstName','','lastName','',
  'amountCents',h.total_cents,'method','unknown','source','Pre-utilizzo cassa',
  'quantities',jsonb_build_object(h.product_id,h.quantity)
 ) ORDER BY h.sale_day,p.sort_order),'[]'::jsonb)
 INTO pre_rows FROM public.casetta_preuse_sales h
 JOIN public.casetta_products p ON p.id=h.product_id WHERE h.sale_day<=d;
 RETURN b||jsonb_build_object('rows',pre_rows||(
  SELECT coalesce(jsonb_agg(live_row.value||jsonb_build_object('source','Cassa')),
   '[]'::jsonb) FROM jsonb_array_elements(b->'rows') AS live_row(value)));
END $body$;

CREATE OR REPLACE FUNCTION public.casetta_claim_report(_day date,_audience text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $body$
DECLARE v_claim uuid;
BEGIN
 IF _audience NOT IN ('finance','stock') OR _day<>(now() AT TIME ZONE 'Europe/Rome')::date
   OR (now() AT TIME ZONE 'Europe/Rome')::time<time '19:00'
   OR (SELECT mode FROM public.casetta_settings WHERE singleton=true)<>'live'
 THEN RAISE EXCEPTION 'Report consentito solo dalle 19 in LIVE';END IF;
 INSERT INTO public.casetta_report_dispatch(report_date,audience) VALUES(_day,_audience)
 ON CONFLICT DO NOTHING;
 UPDATE public.casetta_report_dispatch
 SET state='claimed',claim_id=gen_random_uuid(),claimed_at=now()
 WHERE report_date=_day AND audience=_audience AND state IN ('pending','failed')
 RETURNING claim_id INTO v_claim;
 RETURN v_claim;
END $body$;

CREATE OR REPLACE FUNCTION public.casetta_create_export(_token_hash text,_day date,_audience text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $body$
BEGIN
 IF _token_hash !~ '^[a-f0-9]{64}$'
   OR _audience NOT IN ('finance','stock')
   OR _day<>(now() AT TIME ZONE 'Europe/Rome')::date
   OR (now() AT TIME ZONE 'Europe/Rome')::time<time '19:00'
   OR (SELECT mode FROM public.casetta_settings WHERE singleton=true)<>'live'
 THEN RAISE EXCEPTION 'Export non consentito';END IF;
 INSERT INTO public.casetta_export_tokens(token_hash,report_date,audience,expires_at)
 VALUES(_token_hash,_day,_audience,now()+interval '7 days');
 RETURN true;
END $body$;

DO $guards$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN
 ('casetta_daily_report','casetta_inventory_snapshot','casetta_export_sales',
  'casetta_claim_report','casetta_create_export') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $guards$;