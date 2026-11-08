ALTER TABLE public.live_donations ADD COLUMN capture_claimed_at timestamptz, ADD COLUMN recovery_attempts integer NOT NULL DEFAULT 0, ADD COLUMN recovery_after timestamptz NOT NULL DEFAULT now(), ADD COLUMN recovery_lease_until timestamptz, ADD COLUMN recovery_note text, ADD COLUMN settlement_state text NOT NULL DEFAULT 'unknown';
ALTER TABLE public.live_donations ADD CONSTRAINT live_settlement_state CHECK (settlement_state IN ('unknown','pending','completed','denied','reversed'));
CREATE INDEX live_donation_recovery ON public.live_donations(recovery_after) WHERE status IN ('creating','pending');
CREATE OR REPLACE FUNCTION public.claim_live_capture(_id uuid, _provider_id text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.live_donations SET capture_claimed_at=now() WHERE id=_id AND provider='paypal' AND provider_id=_provider_id AND status='pending' AND capture_claimed_at IS NULL AND settlement_state NOT IN ('denied','reversed');
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_live_capture(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_live_capture(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.claim_live_recovery() RETURNS SETOF public.live_donations LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 WITH candidates AS (
 SELECT id FROM public.live_donations WHERE status IN ('creating','pending') AND recovery_attempts < 8 AND recovery_after <= now() AND created_at < now()-interval '2 minutes' AND (recovery_lease_until IS NULL OR recovery_lease_until < now()) ORDER BY recovery_after,id LIMIT 5 FOR UPDATE SKIP LOCKED
 ) UPDATE public.live_donations d SET recovery_attempts=d.recovery_attempts+1, recovery_lease_until=now()+interval '5 minutes', recovery_after=now()+interval '1 hour' FROM candidates c WHERE d.id=c.id RETURNING d.*
$$;
REVOKE ALL ON FUNCTION public.claim_live_recovery() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_live_recovery() TO service_role;
CREATE OR REPLACE FUNCTION public.confirm_live_donation(_id uuid, _provider text, _provider_id text, _payment_id text, _amount_cents integer, _currency text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.live_donations; oid uuid;
BEGIN
 SELECT * INTO d FROM public.live_donations WHERE id=_id FOR UPDATE;
 IF d.id IS NULL OR d.provider <> _provider OR d.provider_id IS DISTINCT FROM _provider_id OR _payment_id IS NULL OR length(_payment_id)=0 OR d.amount_cents <> _amount_cents OR _currency <> 'EUR' OR d.settlement_state IN ('denied','reversed') THEN RAISE EXCEPTION 'Payment evidence mismatch'; END IF;
 IF d.status='paid' THEN
 IF d.provider_payment_id IS DISTINCT FROM _payment_id THEN RAISE EXCEPTION 'Payment identity mismatch'; END IF;
 SELECT id INTO oid FROM public.live_ornaments WHERE donation_id=d.id; RETURN oid;
 END IF;
 IF d.status NOT IN ('creating','pending') THEN RAISE EXCEPTION 'Payment state mismatch'; END IF;
 UPDATE public.live_donations SET status='paid',paid_at=now(),provider_payment_id=_payment_id,settlement_state='completed',recovery_note=NULL WHERE id=d.id;
 INSERT INTO public.live_ornaments(donation_id,kind,firma,dedica,publish_consent,status) VALUES(d.id,d.kind,CASE WHEN d.publish_consent THEN d.firma END,CASE WHEN d.publish_consent THEN d.dedica END,d.publish_consent,CASE WHEN d.publish_consent AND (coalesce(d.firma,'')<>'' OR coalesce(d.dedica,'')<>'') THEN 'pending' ELSE 'approved' END) RETURNING id INTO oid;
 RETURN oid;
END $$;
REVOKE ALL ON FUNCTION public.confirm_live_donation(uuid,text,text,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_live_donation(uuid,text,text,text,integer,text) TO service_role;
CREATE OR REPLACE FUNCTION public.live_public_tree() RETURNS TABLE(id uuid,kind text,x integer,y integer,firma text,dedica text,created_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT o.id,o.kind,o.x,o.y,CASE WHEN o.publish_consent AND o.status='approved' THEN o.firma END,CASE WHEN o.publish_consent AND o.status='approved' THEN o.dedica END,o.created_at FROM public.live_ornaments o JOIN public.live_donations d ON d.id=o.donation_id WHERE d.status='paid' AND d.settlement_state NOT IN ('denied','reversed') ORDER BY o.created_at DESC,o.id DESC
$$;
REVOKE ALL ON FUNCTION public.live_public_tree() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.live_public_tree() TO service_role;
COMMENT ON COLUMN public.live_donations.capture_claimed_at IS 'Durable one-shot claim. Never clear automatically; ambiguous captures require provider reconciliation, not a second capture.';