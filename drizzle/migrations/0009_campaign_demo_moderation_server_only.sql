REVOKE SELECT, UPDATE ON public.demo_ornaments FROM authenticated;
REVOKE SELECT ON public.wishes FROM authenticated;
GRANT ALL ON public.demo_ornaments TO service_role;
GRANT ALL ON public.wishes TO service_role;
COMMENT ON TABLE public.demo_ornaments IS 'Shared DEMO gifts only. Access and moderation via mode-gated server functions. Never represents verified live payments.';
COMMENT ON TABLE public.wishes IS 'DEMO wishes only. Access and moderation via mode-gated server functions; LIVE purchase-linked wish service not implemented.';