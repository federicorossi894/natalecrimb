-- Register ONLY after the protected /api/public/christmas-gift-email route is deployed.
-- Protected token is read inside PostgreSQL from Vault, not visible to GitHub or visitors.
SELECT cron.schedule(
  'natale-2026-christmas-gift-email',
  '* * * * *',
  $worker$
  SELECT net.http_post(
    url := 'https://natale.crimonza.org/api/public/christmas-gift-email',
    body := '{"kind":"due-gifts"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name='natale_2026_cron_token' LIMIT 1
      )
    ),
    timeout_milliseconds := 15000
  );
  $worker$
);
-- Verification: SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname='natale-2026-christmas-gift-email';
-- Dispatch safely skips until a verified gift_email_due_at <= now() and paid settlement.
