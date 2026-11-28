-- CRI MONZA — solo servizio Babbo Natale a domicilio 2026.
-- Questa migrazione è additiva. Nessuna richiesta pubblica viene aperta;
-- nessuna mail viene spedita; nessun pagamento viene attivato.
-- Password comune: SOLO verifier PBKDF2+salt, mai password in chiaro.
CREATE TABLE IF NOT EXISTS public.santa_admin_settings(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 password_verifier text NOT NULL,
 requests_open boolean NOT NULL DEFAULT false,
 min_offerta_cents integer NOT NULL DEFAULT 3000 CHECK(min_offerta_cents BETWEEN 0 AND 100000),
 event_day date NOT NULL DEFAULT '2026-12-24',
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.santa_admin_settings(singleton,password_verifier,requests_open,min_offerta_cents)
VALUES(true,'pbkdf2_sha256$100000$4Xfvu4mfVtPDy1DbqYYRtYP1$lMGpi2pmehvyFZ_riVKHEJgLqNVhgm8VfOcOzlpjATo',false,3000)
ON CONFLICT(singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.santa_admin_allowlist(
 email text PRIMARY KEY CHECK(email=lower(email) AND length(email) BETWEEN 5 AND 254),
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.santa_admin_allowlist(email,enabled)
VALUES('federico.rossi@crimonza.org',true)
ON CONFLICT(email) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.santa_admin_sessions(
 token_hash text PRIMARY KEY CHECK(token_hash~'^[0-9a-f]{64}$'),
 email text NOT NULL REFERENCES public.santa_admin_allowlist(email),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 CHECK(expires_at>created_at)
);
CREATE INDEX IF NOT EXISTS santa_admin_sessions_expires_idx
 ON public.santa_admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS public.santa_admin_login_attempts(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 client_key text NOT NULL CHECK(length(client_key)=64),
 attempted_at timestamptz NOT NULL DEFAULT now(),
 successful boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS santa_admin_attempt_idx
 ON public.santa_admin_login_attempts(client_key,attempted_at DESC);

CREATE TABLE IF NOT EXISTS public.santa_bookings(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_day date NOT NULL DEFAULT '2026-12-24',
 nome text NOT NULL CHECK(length(trim(nome)) BETWEEN 2 AND 80),
 cognome text NOT NULL CHECK(length(trim(cognome)) BETWEEN 2 AND 80),
 email text NOT NULL CHECK(length(email) BETWEEN 5 AND 254),
 telefono text NOT NULL CHECK(length(telefono) BETWEEN 6 AND 30),
 indirizzo text NOT NULL CHECK(length(trim(indirizzo)) BETWEEN 6 AND 180),
 localita text NOT NULL CHECK(length(trim(localita)) BETWEEN 2 AND 80),
 bambini text[] NOT NULL CHECK(cardinality(bambini) BETWEEN 1 AND 8),
 note text NOT NULL DEFAULT '' CHECK(length(note)<=500),
 quota_offerta_cents integer NOT NULL CHECK(quota_offerta_cents BETWEEN 3000 AND 100000),
 quota_incassata_cents integer NOT NULL DEFAULT 0 CHECK(quota_incassata_cents BETWEEN 0 AND 100000),
 slot_preferito text NOT NULL DEFAULT 'indifferente'
    CHECK(slot_preferito IN ('19:30','20:30','21:30','22:30','indifferente')),
 slot_assegnato text CHECK(slot_assegnato IN ('19:30','20:30','21:30','22:30')),
 squadra text CHECK(squadra~'^Squadra [A-Z]$'),
 status text NOT NULL DEFAULT 'richiesta'
    CHECK(status IN ('richiesta','confermata','completata','annullata')),
 latitude double precision CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision CHECK(longitude BETWEEN -180 AND 180),
 richiesta_mail_stato text NOT NULL DEFAULT 'non_inviata'
    CHECK(richiesta_mail_stato IN ('non_inviata','in_coda','inviata','errore','incerta')),
 conferma_mail_stato text NOT NULL DEFAULT 'non_inviata'
    CHECK(conferma_mail_stato IN ('non_inviata','in_coda','inviata','errore','incerta')),
 privacy_accepted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((status<>'confermata' AND status<>'completata')
   OR (slot_assegnato IS NOT NULL AND squadra IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS santa_bookings_slot_idx ON public.santa_bookings(event_day,slot_assegnato,squadra);
CREATE INDEX IF NOT EXISTS santa_bookings_status_idx ON public.santa_bookings(status,created_at DESC);

CREATE TABLE IF NOT EXISTS public.santa_admin_audit(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_email text NOT NULL REFERENCES public.santa_admin_allowlist(email),
 booking_id uuid REFERENCES public.santa_bookings(id) ON DELETE SET NULL,
 action text NOT NULL CHECK(length(action) BETWEEN 4 AND 80),
 changed jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.santa_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $touch$
BEGIN NEW.updated_at:=now(); RETURN NEW;END $touch$;
DROP TRIGGER IF EXISTS santa_bookings_touch ON public.santa_bookings;
CREATE TRIGGER santa_bookings_touch BEFORE UPDATE ON public.santa_bookings
 FOR EACH ROW EXECUTE FUNCTION public.santa_touch_updated_at();

-- No public RLS policies: every write/read requires a separately authenticated
-- server function with a verified cookie, executed using the service role.
DO $security$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY[
  'santa_admin_settings','santa_admin_allowlist','santa_admin_sessions',
  'santa_admin_login_attempts','santa_bookings','santa_admin_audit'
 ] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',table_name);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO service_role',table_name);
 END LOOP;
END $security$;
REVOKE ALL ON FUNCTION public.santa_touch_updated_at() FROM PUBLIC,anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.santa_admin_login_attempts_id_seq TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.santa_admin_audit_id_seq TO service_role;
