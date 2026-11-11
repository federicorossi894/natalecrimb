-- CRI Monza Christmas scheduled emails: fixed secret held only in Supabase Vault.
-- Do not output the decrypted value or commit a bearer token to GitHub.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
DO $create_secret$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'natale_2026_cron_token') THEN
    PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'natale_2026_cron_token', 'CRI Monza private scheduler to Lovable server');
  END IF;
END $create_secret$;
CREATE OR REPLACE FUNCTION public.verify_natal_cron_token(p_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $verify$
  SELECT length(p_token)=64 AND COALESCE((
    SELECT encode(extensions.digest(d.decrypted_secret, 'sha256'), 'hex') = encode(extensions.digest(p_token, 'sha256'), 'hex')
    FROM vault.decrypted_secrets d WHERE d.name='natale_2026_cron_token' LIMIT 1
  ),false);
$verify$;
REVOKE ALL ON FUNCTION public.verify_natal_cron_token(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_natal_cron_token(text) TO service_role;
