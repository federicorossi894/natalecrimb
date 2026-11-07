CREATE OR REPLACE FUNCTION public.campaign_demo_dispatch(_name text, _args jsonb, _actor uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE = '42501'; END IF;
  IF _name IN ('cash_request_lookup','confirm_cash_request','volunteer_add_ornament','create_wish_token') AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _actor AND role IN ('volunteer','moderator','admin')) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501'; END IF;
  IF _name = 'moderate_wish' AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _actor AND role IN ('moderator','admin')) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501'; END IF;
  PERFORM set_config('request.jwt.claim.sub', coalesce(_actor::text, ''), true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('role','service_role','sub',_actor)::text, true);
  CASE _name
    WHEN 'hang_ornament' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.hang_ornament(_args->>'_kind',(_args->>'_amount_cents')::integer,_args->>'_firma',_args->>'_dedica',(_args->>'_consent')::boolean,(_args->>'_client')::uuid) t;
    WHEN 'public_tree' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.public_tree() t;
    WHEN 'my_ornaments' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.my_ornaments((_args->>'_client')::uuid) t;
    WHEN 'create_cash_request' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.create_cash_request(_args->>'_kind',(_args->>'_amount_cents')::integer,_args->>'_firma',_args->>'_dedica',(_args->>'_consent')::boolean,(_args->>'_client')::uuid) t;
    WHEN 'cash_request_status' THEN SELECT to_jsonb(public.cash_request_status(_args->>'_code')) INTO result;
    WHEN 'cash_request_result' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.cash_request_result(_args->>'_code') t;
    WHEN 'cash_request_lookup' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.cash_request_lookup(_args->>'_code') t;
    WHEN 'confirm_cash_request' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.confirm_cash_request(_args->>'_code',_args->>'_method') t;
    WHEN 'volunteer_add_ornament' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.volunteer_add_ornament(_args->>'_kind',(_args->>'_amount_cents')::integer,_args->>'_firma',_args->>'_dedica',(_args->>'_consent')::boolean,_args->>'_method') t;
    WHEN 'create_wish_token' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.create_wish_token() t;
    WHEN 'wish_lookup' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.wish_lookup(_args->>'_code') t;
    WHEN 'submit_wish' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.submit_wish(_args->>'_code',_args->>'_body',_args->>'_nickname',(_args->>'_consent')::boolean) t;
    WHEN 'public_wishes' THEN SELECT coalesce(jsonb_agg(t),'[]'::jsonb) INTO result FROM public.public_wishes() t;
    WHEN 'moderate_wish' THEN SELECT to_jsonb(public.moderate_wish((_args->>'_id')::uuid,_args->>'_status')) INTO result;
    ELSE RAISE EXCEPTION 'Unknown operation' USING ERRCODE = '42501';
  END CASE;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.campaign_demo_dispatch(text,jsonb,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campaign_demo_dispatch(text,jsonb,uuid) TO service_role;
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('hang_ornament','public_tree','my_ornaments','create_cash_request','cash_request_status','cash_request_result','cash_request_lookup','confirm_cash_request','volunteer_add_ornament','create_wish_token','wish_lookup','submit_wish','public_wishes','moderate_wish') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;
COMMENT ON FUNCTION public.campaign_demo_dispatch(text,jsonb,uuid) IS 'DEMO-only server boundary. Mode checked by campaign server functions; never use this dispatcher for LIVE payments or purchases.';