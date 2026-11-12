-- 2026/27 CRI Monza: bounded recovery for genuine provider payments only.
-- Authentication uses the same 64-byte Vault-held token as Christmas email.
-- Register after the updated protected /api/public/payment-reconciliation endpoint is deployed.
-- In DEMO the handler returns "payments-disabled": no payment, capture or DB mutation.
-- Unschedule when all pending payments are reconciled and the casetta closes.
SELECT cron.schedule(
  'natale-2026-payment-recovery',
  '*/5 * * 11,12,1 *',
  $recovery$
  SELECT net.http_post(
    url := 'https://natale.crimonza.org/api/public/payment-reconciliation',
    body := '{"kind":"payment-reconciliation"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'natale_2026_cron_token'
        LIMIT 1
      )
    ),
    timeout_milliseconds := 15000
  )
  WHERE now() >= '2026-11-12T00:00:00Z'::timestamptz
    AND now() < '2027-01-21T00:00:00Z'::timestamptz;
  $recovery$
);
-- End-of-campaign: SELECT cron.unschedule('natale-2026-payment-recovery');
-- QA: SELECT jobid,schedule,active FROM cron.job WHERE jobname='natale-2026-payment-recovery';
