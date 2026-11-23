-- CRI Monza: verified kiosk hours are 09:00–19:00 Europe/Rome.
-- This is enforced in the database, not just the UI, across all RPC overloads.
-- Calendar date: 24/11/2026, start in LIVE at 09:00 Rome (08:00 UTC).
CREATE OR REPLACE FUNCTION public.casetta_catalog()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $catalog$
DECLARE v_mode text;v_clock time;
BEGIN
 SELECT mode INTO v_mode FROM public.casetta_settings WHERE singleton=true;
 v_clock:=(now() AT TIME ZONE 'Europe/Rome')::time;
 RETURN jsonb_build_object(
  'mode',v_mode,'open',(v_clock>=time '09:00' AND v_clock<time '19:00'),
  'products',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',id,'label',label,'priceCents',price_cents
  ) ORDER BY sort_order,id) FROM public.casetta_products WHERE active),'[]'::jsonb)
 );
END $catalog$;

DO $patch$
DECLARE
 p record; definition text; before_text text; after_text text; changed integer:=0;
BEGIN
 before_text:=$old$IF (now() AT TIME ZONE 'Europe/Rome')::time NOT BETWEEN time '08:00' AND time '19:59:59.999999'
 THEN RAISE EXCEPTION 'Cassa chiusa dalle 20 alle 08'; END IF;$old$;
 after_text:=$new$IF (now() AT TIME ZONE 'Europe/Rome')::time < time '09:00'
    OR (now() AT TIME ZONE 'Europe/Rome')::time >= time '19:00'
 THEN RAISE EXCEPTION 'Cassa chiusa: aperta dalle 09:00 alle 19:00'; END IF;$new$;
 FOR p IN SELECT oid,oid::regprocedure signature FROM pg_proc
  WHERE pronamespace='public'::regnamespace AND proname='casetta_record_sale'
 LOOP
   definition:=pg_get_functiondef(p.oid);
   IF position(after_text IN definition)>0 THEN CONTINUE;END IF;
   IF position(before_text IN definition)=0 THEN
    RAISE EXCEPTION 'Signature not safely patchable: %',p.signature;
   END IF;
   EXECUTE replace(definition,before_text,after_text);
   changed:=changed+1;
 END LOOP;
 IF (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace
  AND proname='casetta_record_sale')<>3
 THEN RAISE EXCEPTION 'Expected exactly three protected checkout RPC signatures';END IF;
END $patch$;

-- Retain TEST mode tonight; switch only at 09:00 Italian time tomorrow.
UPDATE public.casetta_settings SET live_from='2026-11-24T08:00:00+00'::timestamptz
WHERE singleton=true AND mode='test' AND activation_done=false
  AND live_from='2026-11-24T07:00:00+00'::timestamptz
  AND now()<'2026-11-24T08:00:00+00'::timestamptz;

CREATE OR REPLACE FUNCTION public.casetta_activate_scheduled_live()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $activation$
BEGIN
 IF now()<'2026-11-24T08:00:00+00'::timestamptz
   OR now()>='2027-01-01T00:00:00+00'::timestamptz
 THEN RETURN false;END IF;
 UPDATE public.casetta_settings SET mode='live',activation_done=true
 WHERE singleton=true AND mode='test' AND activation_done=false
   AND live_from<=now() AND customer_receipts_enabled=false;
 RETURN FOUND;
END $activation$;

-- pg_cron timezone is GMT. Keep the same stable job names so repeated
-- migrations update, rather than duplicate, existing scheduled tasks.
SELECT cron.schedule('natale-casetta-live-2026-11-24',
 '0 8 24 11 *',$job$SELECT public.casetta_activate_scheduled_live();$job$);
-- 08:00–18:59 UTC = 09:00–19:59 Rome in Nov–Dec. The post-close
-- 19:00 Rome tick sends the administrative daily recap. No receipt emails.
DO $cron$
DECLARE old_command text;
BEGIN
 SELECT command INTO old_command FROM cron.job
 WHERE jobname='natale-2026-casetta-automation';
 IF old_command IS NULL THEN
  RAISE EXCEPTION 'Existing casetta reporting cron missing';
 END IF;
 PERFORM cron.schedule('natale-2026-casetta-automation',
   '*/2 8-18 * 11,12 *',old_command);
END $cron$;

REVOKE ALL ON FUNCTION public.casetta_catalog()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.casetta_catalog() TO service_role;
REVOKE ALL ON FUNCTION public.casetta_activate_scheduled_live()
 FROM PUBLIC,anon,authenticated,service_role;
DO $guard$ DECLARE p record;BEGIN
 FOR p IN SELECT oid::regprocedure signature FROM pg_proc WHERE
 pronamespace='public'::regnamespace AND proname='casetta_record_sale'
 LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',p.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',p.signature);
 END LOOP;
END $guard$;