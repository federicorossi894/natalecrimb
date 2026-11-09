ALTER TABLE public.demo_ornaments ADD COLUMN thank_you text, ADD COLUMN thank_you_claimed_at timestamptz;
CREATE FUNCTION public.claim_online_gift_thanks(_ornament uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF current_setting('request.jwt.claims',true)::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('online_gift_thanks',0));
 IF (SELECT count(*) FROM public.demo_ornaments WHERE thank_you_claimed_at > now()-interval '1 day') >= 80 THEN RETURN false; END IF;
 UPDATE public.demo_ornaments SET thank_you_claimed_at=now() WHERE id=_ornament AND online_request_id IS NOT NULL AND thank_you_claimed_at IS NULL;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_online_gift_thanks(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_online_gift_thanks(uuid) TO service_role;