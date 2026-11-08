CREATE TABLE public.live_donations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 access_hash text NOT NULL,
 provider text NOT NULL CHECK (provider IN ('sumup','paypal')),
 provider_id text UNIQUE,
 provider_payment_id text UNIQUE,
 kind text NOT NULL CHECK (kind IN ('dae','calore','prossimita','cuore')),
 amount_cents integer NOT NULL CHECK (amount_cents BETWEEN 500 AND 100000 AND amount_cents % 100 = 0),
 currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
 status text NOT NULL DEFAULT 'creating' CHECK (status IN ('creating','pending','paid','failed')),
 checkout_url text,
 firma text CHECK (char_length(firma) <= 40),
 dedica text CHECK (char_length(dedica) <= 90),
 publish_consent boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 paid_at timestamptz
);
GRANT ALL ON public.live_donations TO service_role;
ALTER TABLE public.live_donations ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.live_ornaments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 donation_id uuid NOT NULL UNIQUE REFERENCES public.live_donations(id),
 kind text NOT NULL CHECK (kind IN ('dae','calore','prossimita','cuore')),
 x integer NOT NULL DEFAULT 50,
 y integer NOT NULL DEFAULT 60,
 firma text CHECK (char_length(firma) <= 40),
 dedica text CHECK (char_length(dedica) <= 90),
 publish_consent boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.live_ornaments TO service_role;
ALTER TABLE public.live_ornaments ENABLE ROW LEVEL SECURITY;
CREATE INDEX live_ornaments_creation ON public.live_ornaments(created_at,id);
CREATE OR REPLACE FUNCTION public.confirm_live_donation(_id uuid, _provider text, _provider_id text, _payment_id text, _amount_cents integer, _currency text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.live_donations; oid uuid;
BEGIN
 SELECT * INTO d FROM public.live_donations WHERE id=_id FOR UPDATE;
 IF d.id IS NULL OR d.provider <> _provider OR d.provider_id IS DISTINCT FROM _provider_id OR _payment_id IS NULL OR length(_payment_id)=0 OR d.amount_cents <> _amount_cents OR _currency <> 'EUR' THEN
   RAISE EXCEPTION 'Payment evidence mismatch';
 END IF;
 IF d.status='paid' THEN
   IF d.provider_payment_id IS DISTINCT FROM _payment_id THEN RAISE EXCEPTION 'Payment identity mismatch'; END IF;
   SELECT id INTO oid FROM public.live_ornaments WHERE donation_id=d.id;
   RETURN oid;
 END IF;
 UPDATE public.live_donations SET status='paid',paid_at=now(),provider_payment_id=_payment_id WHERE id=d.id;
 INSERT INTO public.live_ornaments(donation_id,kind,firma,dedica,publish_consent,status)
 VALUES(d.id,d.kind,CASE WHEN d.publish_consent THEN d.firma END,CASE WHEN d.publish_consent THEN d.dedica END,d.publish_consent,
 CASE WHEN d.publish_consent AND (coalesce(d.firma,'')<>'' OR coalesce(d.dedica,'')<>'') THEN 'pending' ELSE 'approved' END)
 RETURNING id INTO oid;
 RETURN oid;
END $$;
REVOKE ALL ON FUNCTION public.confirm_live_donation(uuid,text,text,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_live_donation(uuid,text,text,text,integer,text) TO service_role;
CREATE OR REPLACE FUNCTION public.live_public_tree()
RETURNS TABLE(id uuid,kind text,x integer,y integer,firma text,dedica text,created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT o.id,o.kind,o.x,o.y,
 CASE WHEN o.publish_consent AND o.status='approved' THEN o.firma END,
 CASE WHEN o.publish_consent AND o.status='approved' THEN o.dedica END,o.created_at
 FROM public.live_ornaments o JOIN public.live_donations d ON d.id=o.donation_id
 WHERE d.status='paid' ORDER BY o.created_at DESC,o.id DESC
$$;
REVOKE ALL ON FUNCTION public.live_public_tree() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.live_public_tree() TO service_role;