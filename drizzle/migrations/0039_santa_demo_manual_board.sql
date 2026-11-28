-- CRI Monza, Babbo Natale: DEMO con prenotazioni persistenti e lavagna manuale.
-- La pubblicazione reale resta disabilitata. Il passaggio LIVE avviene solo
-- chiamando manualmente santa_activate_live() con privilegi di service_role.
ALTER TABLE public.santa_admin_settings
 ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'demo'
   CHECK(mode IN ('demo','live')),
 ADD COLUMN IF NOT EXISTS board_version bigint NOT NULL DEFAULT 0;
UPDATE public.santa_admin_settings SET mode='demo',requests_open=true
 WHERE singleton AND mode='demo';

ALTER TABLE public.santa_bookings
 ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'demo'
   CHECK(mode IN ('demo','live')),
 ADD COLUMN IF NOT EXISTS team_position integer CHECK(team_position BETWEEN 1 AND 12),
 ADD COLUMN IF NOT EXISTS confirmed_time text
   CHECK(confirmed_time ~ '^(19|20|21|22|23):[0-5][0-9]$'),
 ADD COLUMN IF NOT EXISTS request_id uuid UNIQUE,
 ADD COLUMN IF NOT EXISTS client_key text CHECK(client_key ~ '^[0-9a-f]{64}$'),
 ADD COLUMN IF NOT EXISTS geocode_status text NOT NULL DEFAULT 'pending'
  CHECK(geocode_status IN ('pending','located','approximate','unavailable'));
ALTER TABLE public.santa_bookings DROP CONSTRAINT IF EXISTS santa_bookings_check;
ALTER TABLE public.santa_bookings ADD CONSTRAINT santa_bookings_confirmed_check
 CHECK(status NOT IN ('confermata','completata') OR
       (squadra IS NOT NULL AND confirmed_time IS NOT NULL));

CREATE INDEX IF NOT EXISTS santa_bookings_mode_team_idx ON public.santa_bookings(mode,squadra,team_position);
CREATE INDEX IF NOT EXISTS santa_bookings_demo_rate_idx ON public.santa_bookings(client_key,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS santa_booking_team_order_uniq
 ON public.santa_bookings(mode,squadra,team_position)
 WHERE squadra IS NOT NULL AND team_position IS NOT NULL AND status <> 'annullata';

CREATE TABLE IF NOT EXISTS public.santa_mail_outbox(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 booking_id uuid NOT NULL REFERENCES public.santa_bookings(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('request','confirmed')),
 mode text NOT NULL CHECK(mode IN ('demo','live')),
 state text NOT NULL DEFAULT 'queued'
   CHECK(state IN ('queued','sending','accepted','failed','uncertain','suppressed')),
 claimed_at timestamptz,
 message_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(booking_id,kind)
);
CREATE INDEX IF NOT EXISTS santa_mail_pending ON public.santa_mail_outbox(state,created_at);

CREATE TABLE IF NOT EXISTS public.santa_geocode_cache(
 address_key text PRIMARY KEY CHECK(length(address_key)=64),
 latitude double precision CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision CHECK(longitude BETWEEN -180 AND 180),
 result text NOT NULL CHECK(result IN ('located','unavailable')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.santa_geocode_throttle(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 last_attempt timestamptz NOT NULL DEFAULT to_timestamp(0)
);
INSERT INTO public.santa_geocode_throttle(singleton) VALUES(true) ON CONFLICT DO NOTHING;

-- Per-app server-side rate gate for the shared Nominatim endpoint (max <1/s).
CREATE OR REPLACE FUNCTION public.santa_geocode_claim()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE granted boolean;
BEGIN
 UPDATE public.santa_geocode_throttle SET last_attempt=now()
  WHERE singleton AND last_attempt<now()-interval '1200 milliseconds'
  RETURNING true INTO granted;
 RETURN coalesce(granted,false);
END $$;
REVOKE ALL ON FUNCTION public.santa_geocode_claim() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.santa_geocode_claim() TO service_role;

-- Atomic assignment of the four user-selected teams; never optimizes/reorders.
-- Expected version avoids lost assignments when two organizers work concurrently.
CREATE OR REPLACE FUNCTION public.santa_board_save(
 _actor text,_expected bigint,_assignments jsonb
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE active_mode text; current_version bigint; next_version bigint; matching int; valid_ids int;
BEGIN
 IF jsonb_typeof(_assignments)<>'array' OR jsonb_array_length(_assignments)>250
 THEN RAISE EXCEPTION 'Invalid board payload' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.santa_admin_allowlist WHERE email=_actor AND enabled)
 THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
 SELECT mode,board_version INTO active_mode,current_version
 FROM public.santa_admin_settings WHERE singleton FOR UPDATE;
 IF _expected<>current_version THEN RAISE EXCEPTION 'Board modified by another organizer' USING ERRCODE='40001'; END IF;
 WITH entries AS (
  SELECT x.id,x.team,x.position
  FROM jsonb_to_recordset(_assignments) AS x(id uuid,team text,position int)
 )
 SELECT count(*) INTO matching FROM entries;
 IF matching<>(SELECT count(DISTINCT x.id) FROM jsonb_to_recordset(_assignments) x(id uuid,team text,position int))
 OR matching<>(SELECT count(*) FROM public.santa_bookings WHERE mode=active_mode AND status<>'annullata')
 THEN RAISE EXCEPTION 'Board out of sync: refresh' USING ERRCODE='40001'; END IF;
 IF EXISTS (
  SELECT 1 FROM jsonb_to_recordset(_assignments) x(id uuid,team text,position int)
  WHERE x.team IS NOT NULL AND x.team NOT IN ('Squadra A','Squadra B','Squadra C','Squadra D')
     OR x.team IS NULL AND x.position IS NOT NULL
     OR x.team IS NOT NULL AND (x.position IS NULL OR x.position<1 OR x.position>12)
 ) THEN RAISE EXCEPTION 'Invalid assignment' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.santa_bookings b JOIN jsonb_to_recordset(_assignments) x(id uuid,team text,position int)
   ON b.id=x.id WHERE b.status IN ('confermata','completata') AND x.team IS NULL)
 THEN RAISE EXCEPTION 'Cancel confirmation before removing a team' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(_assignments) x(id uuid,team text,position int)
  WHERE x.team IS NOT NULL GROUP BY x.team,x.position HAVING count(*)>1)
 THEN RAISE EXCEPTION 'Duplicated team position' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO valid_ids FROM public.santa_bookings b
 JOIN jsonb_to_recordset(_assignments) x(id uuid,team text,position int) ON x.id=b.id
 WHERE b.mode=active_mode AND b.status<>'annullata';
 IF valid_ids<>matching THEN RAISE EXCEPTION 'Unknown or stale booking' USING ERRCODE='40001'; END IF;
 -- Unique team/position index requires two-step update within this transaction.
 UPDATE public.santa_bookings SET team_position=NULL
 WHERE mode=active_mode AND status<>'annullata';
 UPDATE public.santa_bookings b SET squadra=x.team,team_position=x.position
 FROM jsonb_to_recordset(_assignments) x(id uuid,team text,position int)
 WHERE b.id=x.id AND b.mode=active_mode AND b.status<>'annullata';
 UPDATE public.santa_admin_settings SET board_version=board_version+1,updated_at=now()
 WHERE singleton RETURNING board_version INTO next_version;
 INSERT INTO public.santa_admin_audit(actor_email,action,changed)
 VALUES(_actor,'board_reordered',jsonb_build_object('version',next_version,'count',matching));
 RETURN next_version;
END $$;
REVOKE ALL ON FUNCTION public.santa_board_save(text,bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.santa_board_save(text,bigint,jsonb) TO service_role;

-- Manual promotion only: erase all demonstration bookings and related mail
-- intents before enabling real intake. The data reset is atomic.
CREATE OR REPLACE FUNCTION public.santa_activate_live()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.santa_admin_settings WHERE singleton FOR UPDATE;
 DELETE FROM public.santa_bookings WHERE mode='demo';
 UPDATE public.santa_admin_settings SET mode='live',requests_open=false,
  board_version=board_version+1,updated_at=now() WHERE singleton;
END $$;
REVOKE ALL ON FUNCTION public.santa_activate_live() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.santa_activate_live() TO service_role;

DO $s$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['santa_mail_outbox','santa_geocode_cache','santa_geocode_throttle']
 LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO service_role',t);
 END LOOP;
END $s$;
-- No SMS, no payment capture, no real customer email is enabled by this schema.
