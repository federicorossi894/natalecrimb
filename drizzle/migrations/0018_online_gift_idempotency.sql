ALTER TABLE public.demo_ornaments ADD COLUMN online_request_id uuid;
CREATE UNIQUE INDEX demo_ornaments_online_request_unique ON public.demo_ornaments(online_request_id) WHERE online_request_id IS NOT NULL;
CREATE FUNCTION public.hang_online_gift(_request uuid,_client uuid,_kind text,_amount integer) RETURNS TABLE(id uuid,status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.demo_ornaments; nid uuid; st text;
BEGIN
 IF current_setting('request.jwt.claims',true)::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 IF _request IS NULL OR _client IS NULL THEN RAISE EXCEPTION 'Missing identity'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_request::text,0));
 SELECT * INTO existing FROM public.demo_ornaments WHERE online_request_id=_request;
 IF FOUND THEN
  IF existing.client_id IS DISTINCT FROM _client OR existing.kind IS DISTINCT FROM _kind OR existing.amount_cents IS DISTINCT FROM _amount THEN RAISE EXCEPTION 'Request mismatch'; END IF;
  RETURN QUERY SELECT existing.id,existing.status; RETURN;
 END IF;
 SELECT h.id,h.status INTO nid,st FROM public.hang_ornament(_kind,_amount,'','',false,_client) h;
 UPDATE public.demo_ornaments SET online_request_id=_request WHERE demo_ornaments.id=nid;
 RETURN QUERY SELECT nid,st;
END $$;
REVOKE ALL ON FUNCTION public.hang_online_gift(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hang_online_gift(uuid,uuid,text,integer) TO service_role;