ALTER TABLE public.demo_ornaments
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS added_by uuid;
ALTER TABLE public.demo_ornaments
  ADD CONSTRAINT demo_ornaments_payment_method_chk CHECK (payment_method IS NULL OR payment_method IN ('cash','pos_manual'));

-- Pending "pay cash at the casetta" requests. Only the SHA-256 of the one-time code is stored.
CREATE TABLE public.cash_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('dae','calore','prossimita','cuore')),
  amount_cents integer NOT NULL CHECK (amount_cents BETWEEN 100 AND 100000),
  firma text CHECK (char_length(firma) <= 40),
  dedica text CHECK (char_length(dedica) <= 90),
  publish_consent boolean NOT NULL DEFAULT false,
  client_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  confirmed_by uuid,
  method text CHECK (method IS NULL OR method IN ('cash','pos_manual')),
  ornament_id uuid
);
CREATE INDEX cash_requests_client_idx ON public.cash_requests (client_id, created_at);
GRANT ALL ON public.cash_requests TO service_role;
ALTER TABLE public.cash_requests ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: visitors and volunteers reach it only through the security-definer functions below.

CREATE OR REPLACE FUNCTION public.is_volunteer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('volunteer','admin','moderator'))
$$;
REVOKE EXECUTE ON FUNCTION public.is_volunteer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_volunteer() TO authenticated;

CREATE OR REPLACE FUNCTION public.ornament_text_status(f text, d text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN f IS NULL AND d IS NULL THEN 'approved'
    WHEN lower(coalesce(d,'') || ' ' || coalesce(f,'')) ~ '(cazz|merd|stronz|vaffan|puttan|coglion|idiot|http|www\.)' THEN 'rejected'
    ELSE 'pending' END
$$;
REVOKE EXECUTE ON FUNCTION public.ornament_text_status(text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cash_code_hash(_code text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT encode(extensions.digest(regexp_replace(translate(upper(coalesce(_code,'')), 'OIL', '011'), '[^0-9A-Z]', '', 'g'), 'sha256'), 'hex')
$$;
REVOKE EXECUTE ON FUNCTION public.cash_code_hash(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_cash_request(_kind text, _amount_cents integer, _firma text, _dedica text, _consent boolean, _client uuid)
RETURNS TABLE (code text, amount_cents integer, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f text := nullif(btrim(coalesce(_firma,'')),''); d text := nullif(btrim(coalesce(_dedica,'')),'');
  n int; raw bytea; tok text := ''; abc text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; i int; exp timestamptz := now() + interval '2 hours';
BEGIN
  IF _kind NOT IN ('dae','calore','prossimita','cuore') THEN RAISE EXCEPTION 'Tipo non valido'; END IF;
  IF _client IS NULL THEN RAISE EXCEPTION 'Client mancante'; END IF;
  IF _amount_cents IS NULL OR _amount_cents < 100 OR _amount_cents > 100000 THEN RAISE EXCEPTION 'Importo non valido (da 1 a 1000 euro)'; END IF;
  IF f IS NOT NULL AND (char_length(f) > 40 OR f !~ '^[[:alnum:] .,''’!-]+$') THEN RAISE EXCEPTION 'Firma non valida'; END IF;
  IF d IS NOT NULL AND char_length(d) > 90 THEN RAISE EXCEPTION 'Dedica troppo lunga'; END IF;
  IF NOT coalesce(_consent,false) THEN f := NULL; d := NULL; END IF;
  SELECT count(*) INTO n FROM cash_requests c WHERE c.client_id = _client AND c.created_at > now() - interval '10 minutes';
  IF n >= 3 THEN RAISE EXCEPTION 'Troppe richieste in poco tempo, riprova tra qualche minuto'; END IF;
  SELECT count(*) INTO n FROM cash_requests c WHERE c.created_at > now() - interval '1 minute';
  IF n >= 60 THEN RAISE EXCEPTION 'Casetta molto affollata, riprova tra poco'; END IF;
  -- Data minimisation: forget stale requests that were never paid.
  DELETE FROM cash_requests c WHERE c.status = 'pending' AND c.expires_at < now() - interval '1 day';
  raw := extensions.gen_random_bytes(16);
  FOR i IN 0..15 LOOP tok := tok || substr(abc, (get_byte(raw, i) % 32) + 1, 1); END LOOP;
  INSERT INTO cash_requests (token_hash, kind, amount_cents, firma, dedica, publish_consent, client_id, expires_at)
  VALUES (public.cash_code_hash(tok), _kind, _amount_cents, f, d, coalesce(_consent,false), _client, exp);
  RETURN QUERY SELECT tok, _amount_cents, exp;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_cash_request(text,integer,text,text,boolean,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_cash_request(text,integer,text,text,boolean,uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cash_request_status(_code text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT CASE WHEN c.status = 'confirmed' THEN 'confirmed' WHEN c.expires_at < now() THEN 'expired' ELSE 'pending' END
    FROM cash_requests c WHERE c.token_hash = public.cash_code_hash(_code)), 'not_found')
$$;
REVOKE EXECUTE ON FUNCTION public.cash_request_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cash_request_status(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cash_request_lookup(_code text)
RETURNS TABLE (status text, kind text, amount_cents integer, firma text, dedica text, publish_consent boolean, expires_at timestamptz, confirmed_at timestamptz, method text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_volunteer() THEN RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT CASE WHEN c.status = 'confirmed' THEN 'confirmed' WHEN c.expires_at < now() THEN 'expired' ELSE 'pending' END,
    c.kind, c.amount_cents, c.firma, c.dedica, c.publish_consent, c.expires_at, c.confirmed_at, c.method
  FROM cash_requests c WHERE c.token_hash = public.cash_code_hash(_code);
END $$;
REVOKE EXECUTE ON FUNCTION public.cash_request_lookup(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cash_request_lookup(text) TO authenticated;

-- Atomic and idempotent: the row lock serialises concurrent scans; a second scan returns the same ornament.
CREATE OR REPLACE FUNCTION public.confirm_cash_request(_code text, _method text)
RETURNS TABLE (result text, ornament_id uuid, ornament_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r cash_requests; st text; nid uuid; yy int; half numeric;
BEGIN
  IF NOT public.is_volunteer() THEN RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501'; END IF;
  IF _method NOT IN ('cash','pos_manual') THEN RAISE EXCEPTION 'Metodo non valido'; END IF;
  SELECT * INTO r FROM cash_requests c WHERE c.token_hash = public.cash_code_hash(_code) FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::text; RETURN; END IF;
  IF r.status = 'confirmed' THEN
    RETURN QUERY SELECT 'already_confirmed'::text, r.ornament_id, (SELECT o.status FROM demo_ornaments o WHERE o.id = r.ornament_id); RETURN;
  END IF;
  IF r.expires_at < now() THEN RETURN QUERY SELECT 'expired'::text, NULL::uuid, NULL::text; RETURN; END IF;
  st := public.ornament_text_status(r.firma, r.dedica);
  yy := 28 + floor(random()*58)::int; half := ((yy - 10) / 80.0) * 34;
  INSERT INTO demo_ornaments (kind, x, y, firma, dedica, publish_consent, status, client_id, payment_method, amount_cents, added_by)
  VALUES (r.kind, round(50 + (random()*2-1)*half*0.8)::int, yy, r.firma, r.dedica, r.publish_consent, st, r.client_id, _method, r.amount_cents, auth.uid())
  RETURNING demo_ornaments.id INTO nid;
  UPDATE cash_requests c SET status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid(), method = _method, ornament_id = nid, firma = NULL, dedica = NULL
  WHERE c.id = r.id;
  RETURN QUERY SELECT 'confirmed'::text, nid, st;
END $$;
REVOKE EXECUTE ON FUNCTION public.confirm_cash_request(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_cash_request(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.volunteer_add_ornament(_kind text, _amount_cents integer, _firma text, _dedica text, _consent boolean, _method text)
RETURNS TABLE (id uuid, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f text := nullif(btrim(coalesce(_firma,'')),''); d text := nullif(btrim(coalesce(_dedica,'')),''); n int; st text; nid uuid; yy int; half numeric;
BEGIN
  IF NOT public.is_volunteer() THEN RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501'; END IF;
  IF _kind NOT IN ('dae','calore','prossimita','cuore') THEN RAISE EXCEPTION 'Tipo non valido'; END IF;
  IF _method NOT IN ('cash','pos_manual') THEN RAISE EXCEPTION 'Metodo non valido'; END IF;
  IF _amount_cents IS NULL OR _amount_cents < 100 OR _amount_cents > 100000 THEN RAISE EXCEPTION 'Importo non valido (da 1 a 1000 euro)'; END IF;
  IF f IS NOT NULL AND (char_length(f) > 40 OR f !~ '^[[:alnum:] .,''’!-]+$') THEN RAISE EXCEPTION 'Firma non valida'; END IF;
  IF d IS NOT NULL AND char_length(d) > 90 THEN RAISE EXCEPTION 'Dedica troppo lunga'; END IF;
  IF NOT coalesce(_consent,false) THEN f := NULL; d := NULL; END IF;
  SELECT count(*) INTO n FROM demo_ornaments o WHERE o.added_by = auth.uid() AND o.created_at > now() - interval '10 minutes';
  IF n >= 40 THEN RAISE EXCEPTION 'Troppi inserimenti in poco tempo, riprova tra qualche minuto'; END IF;
  st := public.ornament_text_status(f, d);
  yy := 28 + floor(random()*58)::int; half := ((yy - 10) / 80.0) * 34;
  INSERT INTO demo_ornaments (kind, x, y, firma, dedica, publish_consent, status, client_id, payment_method, amount_cents, added_by)
  VALUES (_kind, round(50 + (random()*2-1)*half*0.8)::int, yy, f, d, coalesce(_consent,false), st, gen_random_uuid(), _method, _amount_cents, auth.uid())
  RETURNING demo_ornaments.id INTO nid;
  RETURN QUERY SELECT nid, st;
END $$;
REVOKE EXECUTE ON FUNCTION public.volunteer_add_ornament(text,integer,text,text,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.volunteer_add_ornament(text,integer,text,text,boolean,text) TO authenticated;