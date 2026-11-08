CREATE OR REPLACE FUNCTION public.campaign_volunteer_dispatch(_token_hash text, _name text, _args jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s volunteer_sessions; result jsonb; oid uuid; res text;
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE = '42501'; END IF;
  IF _name NOT IN ('cash_request_lookup','confirm_cash_request','volunteer_add_ornament','create_wish_token') THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501'; END IF;
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
    WHEN 'create_wish_token' THEN
      SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.create_wish_token() t;
      res := 'wish_token_created';
  END CASE;
  PERFORM set_config('cri.volunteer_session', '', true);
  UPDATE volunteer_sessions v SET last_seen_at = now() WHERE v.id = s.id;
  IF _name <> 'cash_request_lookup' THEN
    INSERT INTO volunteer_audit (session_id, display_name, action, result, ornament_id) VALUES (s.id, s.display_name, _name, res, oid);
  END IF;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.campaign_volunteer_dispatch(text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campaign_volunteer_dispatch(text,text,jsonb) TO service_role;