-- The donor's phone holds the one-time code: after a volunteer confirms, it can recover which ornament was hung
-- (to open the postcard/email step) without repeating the gift. Returns no personal data.
CREATE OR REPLACE FUNCTION public.cash_request_result(_code text)
RETURNS TABLE (status text, kind text, amount_cents integer, ornament_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN c.status = 'confirmed' THEN 'confirmed' WHEN c.expires_at < now() THEN 'expired' ELSE 'pending' END,
    c.kind, c.amount_cents, CASE WHEN c.status = 'confirmed' THEN c.ornament_id END
  FROM public.cash_requests c WHERE c.token_hash = public.cash_code_hash(_code)
$$;
REVOKE EXECUTE ON FUNCTION public.cash_request_result(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cash_request_result(text) TO anon, authenticated;