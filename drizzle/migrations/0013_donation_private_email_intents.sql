ALTER TABLE public.live_donations ADD COLUMN donor_email_requested boolean NOT NULL DEFAULT false, ADD COLUMN donor_email_private text, ADD COLUMN donor_email_state text NOT NULL DEFAULT 'not_requested', ADD COLUMN donor_email_attempts integer NOT NULL DEFAULT 0, ADD COLUMN donor_email_claim uuid, ADD COLUMN donor_email_audit jsonb NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN gift_email_private text, ADD COLUMN gift_email_data jsonb, ADD COLUMN gift_email_due_at timestamptz, ADD COLUMN gift_email_state text NOT NULL DEFAULT 'not_requested', ADD COLUMN gift_email_attempts integer NOT NULL DEFAULT 0, ADD COLUMN gift_email_claim uuid, ADD COLUMN gift_email_audit jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.live_donations ADD CONSTRAINT donor_email_explicit_optin CHECK ((donor_email_requested AND donor_email_private IS NOT NULL AND length(donor_email_private)<=254 AND donor_email_private ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') OR (NOT donor_email_requested AND donor_email_private IS NULL)), ADD CONSTRAINT donation_email_states CHECK (donor_email_state IN ('not_requested','blocked','claimed','accepted','failed','suppressed','cancelled') AND gift_email_state IN ('not_requested','blocked','claimed','accepted','failed','suppressed','cancelled'));
COMMENT ON COLUMN public.live_donations.donor_email_private IS 'Private explicit donor opt-in only. Never project into public tree, browser storage, URLs or logs. Clear after accepted send or opt-out. Not marketing.';
COMMENT ON COLUMN public.live_donations.gift_email_data IS 'Single expected gift recipient and minimal message tied to this paid donation, not an email queue. Managed sending owns delivery retries, suppression and unsubscribe.';
CREATE OR REPLACE FUNCTION public.claim_donation_email(_id uuid,_kind text,_retry boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.live_donations; s text; n integer; c uuid;
BEGIN
 IF _kind NOT IN ('receipt','gift') THEN RAISE EXCEPTION 'Invalid purpose'; END IF;
 SELECT * INTO d FROM public.live_donations WHERE id=_id FOR UPDATE;
 IF d.id IS NULL OR d.status<>'paid' OR d.settlement_state<>'completed' THEN RETURN NULL; END IF;
 IF _kind='receipt' THEN
  IF NOT d.donor_email_requested OR d.donor_email_private IS NULL THEN RETURN NULL; END IF;
  s:=d.donor_email_state; n:=d.donor_email_attempts;
 ELSE
  IF d.gift_email_private IS NULL OR (d.gift_email_due_at IS NOT NULL AND d.gift_email_due_at>now()) THEN RETURN NULL; END IF;
  s:=d.gift_email_state; n:=d.gift_email_attempts;
 END IF;
 IF s NOT IN ('blocked','failed') OR n>=3 OR (s='failed' AND NOT _retry) THEN RETURN NULL; END IF;
 c:=gen_random_uuid();
 IF _kind='receipt' THEN UPDATE public.live_donations SET donor_email_state='claimed',donor_email_claim=c,donor_email_attempts=n+1,donor_email_audit=donor_email_audit||jsonb_build_array(jsonb_build_object('at',now(),'state','claimed','claim',c)) WHERE id=_id;
 ELSE UPDATE public.live_donations SET gift_email_state='claimed',gift_email_claim=c,gift_email_attempts=n+1,gift_email_audit=gift_email_audit||jsonb_build_array(jsonb_build_object('at',now(),'state','claimed','claim',c)) WHERE id=_id; END IF;
 RETURN c;
END $$;
CREATE OR REPLACE FUNCTION public.finish_donation_email(_id uuid,_kind text,_claim uuid,_state text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF _state NOT IN ('accepted','failed','suppressed') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
 IF _kind='receipt' THEN UPDATE public.live_donations SET donor_email_state=_state,donor_email_private=CASE WHEN _state IN ('accepted','suppressed') THEN NULL ELSE donor_email_private END,donor_email_requested=CASE WHEN _state IN ('accepted','suppressed') THEN false ELSE donor_email_requested END,donor_email_audit=donor_email_audit||jsonb_build_array(jsonb_build_object('at',now(),'state',_state,'claim',_claim)) WHERE id=_id AND donor_email_claim=_claim AND donor_email_state='claimed';
 ELSIF _kind='gift' THEN UPDATE public.live_donations SET gift_email_state=_state,gift_email_private=CASE WHEN _state IN ('accepted','suppressed') THEN NULL ELSE gift_email_private END,gift_email_data=CASE WHEN _state IN ('accepted','suppressed') THEN NULL ELSE gift_email_data END,gift_email_audit=gift_email_audit||jsonb_build_array(jsonb_build_object('at',now(),'state',_state,'claim',_claim)) WHERE id=_id AND gift_email_claim=_claim AND gift_email_state='claimed';
 ELSE RAISE EXCEPTION 'Invalid purpose'; END IF;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_donation_email(uuid,text,boolean),public.finish_donation_email(uuid,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_donation_email(uuid,text,boolean),public.finish_donation_email(uuid,text,uuid,text) TO service_role;
REVOKE ALL ON public.live_donations FROM anon,authenticated;
GRANT ALL ON public.live_donations TO service_role;