CREATE OR REPLACE FUNCTION public.claim_staff_gmail_qa(p_actor uuid,p_request uuid,p_kind text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid;
BEGIN
 IF current_setting('request.jwt.claims',true)::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 IF p_actor IS NULL OR p_request IS NULL OR p_kind NOT IN ('receipt','gift_now','christmas_simulation') THEN RAISE EXCEPTION 'Invalid QA request'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('moderator','admin')) AND NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_actor AND u.email='federico.rossi@crimonza.org' AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until <= now())) THEN RAISE EXCEPTION 'Staff only' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(740014);
 IF EXISTS(SELECT 1 FROM public.staff_qa_attempts WHERE request_id=p_request) THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM public.staff_qa_attempts WHERE created_at > now()-interval '10 minutes') OR
 (SELECT count(*) FROM public.staff_qa_attempts WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'Europe/Rome') AT TIME ZONE 'Europe/Rome') >= 3 THEN RETURN NULL; END IF;
 INSERT INTO public.staff_qa_attempts(actor_id,request_id,kind) VALUES(p_actor,p_request,p_kind) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.claim_staff_gmail_qa(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_staff_gmail_qa(uuid,uuid,text) TO service_role;
COMMENT ON FUNCTION public.claim_staff_gmail_qa(uuid,uuid,text) IS 'QA only: verified fixed-owner or existing staff; service-only actor from revalidated bearer, no roles granted, permanent claims and unchanged global budget.';