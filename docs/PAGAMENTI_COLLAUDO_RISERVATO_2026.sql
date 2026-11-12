-- Two and only two €5 real donations for authorized CRI testing.
-- Only the trusted server role may access these non-public permits.
CREATE TABLE IF NOT EXISTS public.natale_payment_qa_2026 (
  provider text PRIMARY KEY CHECK (provider IN ('sumup','paypal')),
  donation_id uuid NOT NULL UNIQUE,
  actor uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  webhook_verified_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT '2026-11-16T00:00:00Z'::timestamptz
);
ALTER TABLE public.natale_payment_qa_2026 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.natale_payment_qa_2026 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.natale_payment_qa_2026 TO service_role;
COMMENT ON TABLE public.natale_payment_qa_2026 IS 'CRI Monza, strictly operator-only 2026 live payment tests. One €5 permit per provider; never enabled for public online donations.';
