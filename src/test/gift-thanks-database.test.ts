// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';
it('service-only thank-you claim allows one generation per gift and at most 80 daily', async () => {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.demo_ornaments(id uuid primary key, online_request_id uuid);
    INSERT INTO public.demo_ornaments VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');`);
  await db.exec(readFileSync('drizzle/migrations/0021_online_gift_thank_you.sql', 'utf8'));
  const claim = () => db.query<{ allowed: boolean }>(`SELECT public.claim_online_gift_thanks('00000000-0000-4000-8000-000000000001') AS allowed`);
  await db.exec(`SELECT set_config('request.jwt.claims','{"role":"anon"}',false)`);
  await expect(claim()).rejects.toThrow('Server only');
  await db.exec(`SELECT set_config('request.jwt.claims','{"role":"service_role"}',false)`);
  expect((await claim()).rows[0]?.allowed).toBe(true);
  expect((await claim()).rows[0]?.allowed).toBe(false);
  await db.exec(`INSERT INTO public.demo_ornaments(id, online_request_id, thank_you_claimed_at)
    SELECT ('10000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid, '00000000-0000-4000-8000-000000000002', now() FROM generate_series(1,79) i;
    INSERT INTO public.demo_ornaments(id, online_request_id) VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004');`);
  expect((await db.query<{allowed:boolean}>(`SELECT public.claim_online_gift_thanks('00000000-0000-4000-8000-000000000003') AS allowed`)).rows[0]?.allowed).toBe(false);
  await db.close();
});