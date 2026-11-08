ALTER TABLE public.volunteer_audit ADD COLUMN IF NOT EXISTS wish_id uuid;
CREATE OR REPLACE FUNCTION public.volunteer_demo_review(_token_hash text, _action text, _type text DEFAULT NULL, _id uuid DEFAULT NULL, _decision text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s volunteer_sessions; item record; result text; flags text[];
BEGIN
 IF current_setting('request.jwt.claims',true)::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM volunteer_sessions WHERE token_hash=_token_hash AND revoked_at IS NULL AND expires_at>now();
 IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 IF _action='list' THEN
 RETURN jsonb_build_object('count',(SELECT count(*) FROM wishes WHERE status='pending' AND publish_consent)+(SELECT count(*) FROM demo_ornaments WHERE status='pending' AND publish_consent AND coalesce(dedica,'')<>''),'items',(SELECT coalesce(jsonb_agg(q),'[]'::jsonb) FROM (SELECT * FROM (SELECT id,'wish'::text AS type,body,nickname,created_at,auto_flags AS flags FROM wishes WHERE status='pending' AND publish_consent UNION ALL SELECT id,'dedication',dedica,firma,created_at,public.wish_flags(dedica,firma) FROM demo_ornaments WHERE status='pending' AND publish_consent AND coalesce(dedica,'')<>'') all_items ORDER BY created_at LIMIT 100) q));
 END IF;
 IF _action IS DISTINCT FROM 'decide' OR _type NOT IN ('wish','dedication') OR _id IS NULL OR _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid operation'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(s.id::text));
 IF (SELECT count(*) FROM volunteer_audit WHERE session_id=s.id AND action='review' AND created_at>now()-interval '1 minute')>=20 THEN RETURN jsonb_build_object('result','rate_limited'); END IF;
 IF _type='wish' THEN SELECT status,publish_consent,body,nickname,auto_flags INTO item FROM wishes WHERE id=_id FOR UPDATE;
 ELSE SELECT status,publish_consent,dedica AS body,firma AS nickname,public.wish_flags(dedica,firma) AS auto_flags INTO item FROM demo_ornaments WHERE id=_id FOR UPDATE; END IF;
 IF NOT FOUND THEN result:='not_found';
 ELSIF item.status<>'pending' THEN result:='already_processed';
 ELSIF NOT item.publish_consent THEN result:='no_consent';
 ELSE
 flags:=public.wish_flags(item.body,item.nickname);
 IF _decision='approved' AND (cardinality(flags)>0 OR cardinality(item.auto_flags)>0 OR char_length(item.body) NOT BETWEEN 2 AND CASE WHEN _type='wish' THEN 180 ELSE 90 END OR char_length(coalesce(item.nickname,''))>CASE WHEN _type='wish' THEN 24 ELSE 40 END) THEN result:='escalate';
 ELSE
 IF _type='wish' THEN UPDATE wishes SET status=_decision,moderated_at=now(),moderated_by=s.id WHERE id=_id AND status='pending'; ELSE UPDATE demo_ornaments SET status=_decision WHERE id=_id AND status='pending'; END IF;
 result:=_decision;
 END IF;
 END IF;
 INSERT INTO volunteer_audit(session_id,display_name,action,result,ornament_id,wish_id) VALUES(s.id,s.display_name,'review',result,CASE WHEN _type='dedication' THEN _id END,CASE WHEN _type='wish' THEN _id END);
 RETURN jsonb_build_object('result',result);
END $$;
REVOKE ALL ON FUNCTION public.volunteer_demo_review(text,text,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.volunteer_demo_review(text,text,text,uuid,text) TO service_role;