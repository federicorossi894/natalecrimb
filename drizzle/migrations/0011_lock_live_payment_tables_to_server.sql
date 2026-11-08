REVOKE ALL ON public.live_donations, public.live_ornaments FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.live_donations, public.live_ornaments TO service_role;