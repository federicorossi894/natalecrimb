-- CRI Monza — start LIVE at 08:00 Europe/Rome on 24 November 2026.
-- Customer receipts remain available in source but are disabled by default in
-- both DB and application. Admin daily reports are not affected.
ALTER TABLE public.casetta_settings
 ADD COLUMN IF NOT EXISTS customer_receipts_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.casetta_settings
 ADD COLUMN IF NOT EXISTS live_from timestamptz;
ALTER TABLE public.casetta_settings
 ADD COLUMN IF NOT EXISTS activation_done boolean NOT NULL DEFAULT false;

-- This migration is only valid while the kiosk is still in TEST mode. Never
-- revert LIVE to TEST on a replay after the launch.
UPDATE public.casetta_settings
 SET customer_receipts_enabled=false,
     live_from='2026-11-24T07:00:00+00'::timestamptz,
     activation_done=false
 WHERE singleton=true AND mode='test'
   AND now()<'2026-11-24T07:00:00+00'::timestamptz;

-- Strictest protection: no new customer email goes into any of the old
-- 5/7/8-argument sale RPCs, even from a cached checkout version.
DO $patch_sales$
DECLARE p record; definition text; original text;
BEGIN
 original:=$needle$v_email:=nullif(lower(trim(coalesce(_email,''))),'');$needle$;
 FOR p IN SELECT oid,oid::regprocedure AS signature
   FROM pg_proc WHERE pronamespace='public'::regnamespace
    AND proname='casetta_record_sale'
 LOOP
  definition:=pg_get_functiondef(p.oid);
  IF position('customer_receipts_enabled' in definition)>0 THEN CONTINUE;END IF;
  IF position(original in definition)=0 THEN
    RAISE EXCEPTION 'Email guard location missing in %',p.signature;
  END IF;
  definition:=replace(definition,original,
   $replacement$v_email:=CASE WHEN (SELECT customer_receipts_enabled
     FROM public.casetta_settings WHERE singleton=true)
      THEN nullif(lower(trim(coalesce(_email,''))),'')
      ELSE NULL END;$replacement$);
  EXECUTE definition;
 END LOOP;
END $patch_sales$;

-- Queue processing stays dormant even if an older version enqueues an email.
DO $patch_claims$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('public.casetta_claim_receipts(integer)'::regprocedure);
 IF position('customer_receipts_enabled' in definition)=0 THEN
  IF position(E'BEGIN\n WITH picked AS (' in definition)=0 THEN
   RAISE EXCEPTION 'Unexpected receipt claim function; no mutation';
  END IF;
  definition:=replace(definition,E'BEGIN\n WITH picked AS (',
   E'BEGIN\n IF NOT coalesce((SELECT customer_receipts_enabled FROM public.casetta_settings WHERE singleton=true),false)\n THEN RETURN ''[]''::jsonb;END IF;\n WITH picked AS (');
  EXECUTE definition;
 END IF;
END $patch_claims$;

-- One-time (idempotent) switch, with explicit activation and year bounds.
CREATE OR REPLACE FUNCTION public.casetta_activate_scheduled_live()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $activate$
BEGIN
 IF now()<'2026-11-24T07:00:00+00'::timestamptz
  OR now()>='2027-01-01T00:00:00+00'::timestamptz
 THEN RETURN false;END IF;
 UPDATE public.casetta_settings
 SET mode='live',activation_done=true
 WHERE singleton=true AND mode='test' AND activation_done=false
   AND live_from<now() AND customer_receipts_enabled=false;
 RETURN FOUND;
END $activate$;

REVOKE ALL ON FUNCTION public.casetta_activate_scheduled_live()
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.casetta_claim_receipts(integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.casetta_claim_receipts(integer) TO service_role;
DO $grants$
DECLARE p record;
BEGIN
 FOR p IN SELECT oid::regprocedure AS signature
  FROM pg_proc
  WHERE pronamespace='public'::regnamespace AND proname='casetta_record_sale'
 LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',p.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',p.signature);
 END LOOP;
END $grants$;

-- Cron runs in GMT (verified 23 November 2026). 07:00 GMT = 08:00 Rome.
-- The job has an activation_done guard, so future annual recurrence is inert.
SELECT cron.schedule(
 'natale-casetta-live-2026-11-24',
 '0 7 24 11 *',
 $job$SELECT public.casetta_activate_scheduled_live();$job$
);
