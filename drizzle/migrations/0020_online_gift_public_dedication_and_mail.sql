CREATE FUNCTION public.hang_online_gift(_request uuid,_client uuid,_kind text,_amount integer,_firma text,_dedica text,_consent boolean) RETURNS TABLE(id uuid,status text)
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
 SELECT h.id,h.status INTO nid,st FROM public.hang_ornament(_kind,_amount,coalesce(_firma,''),coalesce(_dedica,''),coalesce(_consent,false),_client) h;
 -- Online gift dedications are published immediately (staff can still revoke); filtered text stays rejected.
 IF st='pending' THEN st:='approved'; END IF;
 UPDATE public.demo_ornaments SET online_request_id=_request, status=st WHERE demo_ornaments.id=nid;
 RETURN QUERY SELECT nid,st;
END $$;
REVOKE ALL ON FUNCTION public.hang_online_gift(uuid,uuid,text,integer,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hang_online_gift(uuid,uuid,text,integer,text,text,boolean) TO service_role;

CREATE TABLE public.online_gift_mails(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ornament_id uuid NOT NULL,
 purpose text NOT NULL CHECK (purpose IN ('receipt','gift')),
 kind text NOT NULL CHECK (kind IN ('receipt','gift_now','gift_christmas')),
 recipient_hash text NOT NULL,
 state text NOT NULL DEFAULT 'claimed' CHECK (state IN ('claimed','accepted','failed','unknown')),
 message_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 UNIQUE (ornament_id, purpose)
);
GRANT ALL ON public.online_gift_mails TO service_role;
ALTER TABLE public.online_gift_mails ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.claim_online_gift_mail(_ornament uuid,_kind text,_recipient_hash text) RETURNS TABLE(id uuid, reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p text := CASE WHEN _kind='receipt' THEN 'receipt' ELSE 'gift' END; nid uuid;
BEGIN
 IF current_setting('request.jwt.claims',true)::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('online_gift_mails',0));
 IF EXISTS (SELECT 1 FROM online_gift_mails m WHERE m.ornament_id=_ornament AND m.purpose=p) THEN RETURN QUERY SELECT NULL::uuid,'already_sent'; RETURN; END IF;
 IF (SELECT count(*) FROM online_gift_mails m WHERE m.created_at > now()-interval '1 day') >= 80 THEN RETURN QUERY SELECT NULL::uuid,'busy'; RETURN; END IF;
 IF (SELECT count(*) FROM online_gift_mails m WHERE m.created_at > now()-interval '1 minute') >= 6 THEN RETURN QUERY SELECT NULL::uuid,'busy'; RETURN; END IF;
 IF (SELECT count(*) FROM online_gift_mails m WHERE m.recipient_hash=_recipient_hash AND m.created_at > now()-interval '1 day') >= 4 THEN RETURN QUERY SELECT NULL::uuid,'recipient_limit'; RETURN; END IF;
 INSERT INTO online_gift_mails(ornament_id,purpose,kind,recipient_hash) VALUES (_ornament,p,_kind,_recipient_hash) RETURNING online_gift_mails.id INTO nid;
 RETURN QUERY SELECT nid,NULL::text;
END $$;
REVOKE ALL ON FUNCTION public.claim_online_gift_mail(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_online_gift_mail(uuid,text,text) TO service_role;