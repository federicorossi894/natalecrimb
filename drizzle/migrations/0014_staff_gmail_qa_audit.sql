CREATE TABLE public.staff_qa_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL, request_id uuid NOT NULL UNIQUE,
 kind text NOT NULL CHECK (kind IN ('receipt','gift_now','christmas_simulation')),
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
 state text NOT NULL DEFAULT 'claimed' CHECK (state IN ('claimed','accepted','failed','unknown')),
 provider_message_id text, provider_status integer
);
GRANT ALL ON public.staff_qa_attempts TO service_role;
ALTER TABLE public.staff_qa_attempts ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.staff_qa_attempts IS 'Private manual staff QA audit only; no recipients, content, queue or scheduled sending.';
CREATE FUNCTION public.claim_staff_gmail_qa(p_actor uuid,p_request uuid,p_kind text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid;
BEGIN
 IF p_actor IS NULL OR p_request IS NULL OR p_kind NOT IN ('receipt','gift_now','christmas_simulation') THEN RAISE EXCEPTION 'Invalid QA request'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('moderator','admin')) THEN RAISE EXCEPTION 'Staff only'; END IF;
 PERFORM pg_advisory_xact_lock(740014);
 IF EXISTS(SELECT 1 FROM public.staff_qa_attempts WHERE request_id=p_request) THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM public.staff_qa_attempts WHERE created_at > now()-interval '10 minutes') OR
 (SELECT count(*) FROM public.staff_qa_attempts WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'Europe/Rome') AT TIME ZONE 'Europe/Rome') >= 3 THEN RETURN NULL; END IF;
 INSERT INTO public.staff_qa_attempts(actor_id,request_id,kind) VALUES(p_actor,p_request,p_kind) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION public.finish_staff_gmail_qa(p_id uuid,p_state text,p_message text DEFAULT NULL,p_status integer DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF p_state NOT IN ('accepted','failed','unknown') THEN RAISE EXCEPTION 'Invalid result'; END IF;
 UPDATE public.staff_qa_attempts SET state=p_state, finished_at=now(),provider_message_id=p_message,provider_status=p_status WHERE id=p_id AND state='claimed';
END $$;
REVOKE ALL ON FUNCTION public.claim_staff_gmail_qa(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_staff_gmail_qa(uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_staff_gmail_qa(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_staff_gmail_qa(uuid,text,text,integer) TO service_role;