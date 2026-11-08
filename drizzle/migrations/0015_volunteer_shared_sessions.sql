-- Shared-password volunteer area: independent server sessions (no auth.users), service-only.
CREATE TABLE IF NOT EXISTS public.volunteer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 3 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.volunteer_login_attempts (
  id bigserial PRIMARY KEY,
  client_key text NOT NULL CHECK (char_length(client_key) <= 64),
  ok boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS volunteer_login_attempts_key_idx ON public.volunteer_login_attempts (client_key, created_at);
CREATE TABLE IF NOT EXISTS public.volunteer_audit (
  id bigserial PRIMARY KEY,
  session_id uuid,
  display_name text NOT NULL,
  action text NOT NULL,
  result text,
  ornament_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.volunteer_password_cache (
  source text PRIMARY KEY CHECK (char_length(source) <= 64),
  verifier text NOT NULL CHECK (char_length(verifier) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['volunteer_sessions','volunteer_login_attempts','volunteer_audit','volunteer_password_cache'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON SEQUENCE public.volunteer_login_attempts_id_seq, public.volunteer_audit_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.is_volunteer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('volunteer','admin','moderator'))
    OR (auth.uid() IS NOT NULL
        AND current_setting('cri.volunteer_session', true) = auth.uid()::text
        AND EXISTS (SELECT 1 FROM public.volunteer_sessions s WHERE s.id = auth.uid() AND s.revoked_at IS NULL AND s.expires_at > now()))
$$;

CREATE OR REPLACE FUNCTION public.volunteer_login_allowed(_client_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE = '42501'; END IF;
  DELETE FROM volunteer_login_attempts a WHERE a.created_at < now() - interval '1 day';
  RETURN (SELECT count(*) FROM volunteer_login_attempts a WHERE a.client_key = _client_key AND NOT a.ok AND a.created_at > now() - interval '15 minutes') < 8
     AND (SELECT count(*) FROM volunteer_login_attempts a WHERE NOT a.ok AND a.created_at > now() - interval '5 minutes') < 120
     AND (SELECT count(*) FROM volunteer_login_attempts a WHERE a.client_key = _client_key AND a.created_at > now() - interval '1 minute') < 12;
END $$;

CREATE OR REPLACE FUNCTION public.volunteer_login_record(_client_key text, _ok boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE = '42501'; END IF;
  INSERT INTO volunteer_login_attempts (client_key, ok) VALUES (left(_client_key, 64), _ok);
END $$;

CREATE OR REPLACE FUNCTION public.volunteer_session_open(_token_hash text, _display_name text, _hours integer)
RETURNS TABLE (session_id uuid, display_name text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n text := regexp_replace(btrim(coalesce(_display_name,'')), '\s+', ' ', 'g'); sid uuid; exp timestamptz;
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE = '42501'; END IF;
  IF char_length(n) NOT BETWEEN 3 AND 80 OR n !~ '^[[:alpha:]''’.-]+( [[:alpha:]''’.-]+)+$' THEN RAISE EXCEPTION 'Nome non valido'; END IF;
  IF _hours IS NULL OR _hours < 1 OR _hours > 12 THEN RAISE EXCEPTION 'Durata non valida'; END IF;
  DELETE FROM volunteer_sessions s WHERE s.expires_at < now() - interval '30 days';
  exp := now() + make_interval(hours => _hours);
  INSERT INTO volunteer_sessions (token_hash, display_name, expires_at) VALUES (_token_hash, n, exp) RETURNING id INTO sid;
  INSERT INTO volunteer_audit (session_id, display_name, action, result) VALUES (sid, n, 'login', 'ok');
  RETURN QUERY SELECT sid, n, exp;
END $$;

CREATE OR REPLACE FUNCTION public.volunteer_session_get(_token_hash text)
RETURNS TABLE (session_id uuid, display_name text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT s.id, s.display_name, s.expires_at FROM volunteer_sessions s
    WHERE s.token_hash = _token_hash AND s.revoked_at IS NULL AND s.expires_at > now();
END $$;

CREATE OR REPLACE FUNCTION public.volunteer_session_close(_token_hash text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s volunteer_sessions;
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE = '42501'; END IF;
  UPDATE volunteer_sessions v SET revoked_at = now() WHERE v.token_hash = _token_hash AND v.revoked_at IS NULL RETURNING * INTO s;
  IF FOUND THEN INSERT INTO volunteer_audit (session_id, display_name, action, result) VALUES (s.id, s.display_name, 'logout', 'ok'); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.campaign_volunteer_dispatch(_token_hash text, _name text, _args jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s volunteer_sessions; result jsonb; oid uuid; res text;
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE = '42501'; END IF;
  IF _name NOT IN ('cash_request_lookup','confirm_cash_request','volunteer_add_ornament') THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM volunteer_sessions v WHERE v.token_hash = _token_hash AND v.revoked_at IS NULL AND v.expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501'; END IF;
  PERFORM set_config('request.jwt.claim.sub', s.id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('role','service_role','sub',s.id)::text, true);
  PERFORM set_config('cri.volunteer_session', s.id::text, true);
  CASE _name
    WHEN 'cash_request_lookup' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.cash_request_lookup(_args->>'_code') t;
    WHEN 'confirm_cash_request' THEN
      SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.confirm_cash_request(_args->>'_code',_args->>'_method') t;
      res := result->0->>'result'; oid := (result->0->>'ornament_id')::uuid;
    WHEN 'volunteer_add_ornament' THEN
      SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.volunteer_add_ornament(_args->>'_kind',(_args->>'_amount_cents')::integer,_args->>'_firma',_args->>'_dedica',(_args->>'_consent')::boolean,_args->>'_method') t;
      res := 'added'; oid := (result->0->>'id')::uuid;
  END CASE;
  PERFORM set_config('cri.volunteer_session', '', true);
  UPDATE volunteer_sessions v SET last_seen_at = now() WHERE v.id = s.id;
  IF _name <> 'cash_request_lookup' THEN
    INSERT INTO volunteer_audit (session_id, display_name, action, result, ornament_id) VALUES (s.id, s.display_name, _name, res, oid);
  END IF;
  RETURN result;
END $$;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['volunteer_login_allowed(text)','volunteer_login_record(text,boolean)','volunteer_session_open(text,text,integer)','volunteer_session_get(text)','volunteer_session_close(text)','campaign_volunteer_dispatch(text,text,jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END $$;
COMMENT ON TABLE public.volunteer_sessions IS 'Shared-password volunteer sessions; display_name is self-declared, not a verified identity.';
COMMENT ON FUNCTION public.campaign_volunteer_dispatch(text,text,jsonb) IS 'DEMO cash desk via shared-password session: lookup/confirm/manual ornament only.';