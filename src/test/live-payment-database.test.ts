// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, expect, it } from 'vitest';

// In-memory PostgreSQL only: no managed credentials, real rows or provider APIs.
let db: PGlite;
const id = '00000000-0000-4000-8000-000000000001';
beforeAll(async () => {
  db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  for (const name of ['0010_live_donation_checkout_and_atomic_ornaments','0011_lock_live_payment_tables_to_server','0012_live_payment_capture_claim_and_recovery']) {
    await db.exec(await readFile(`drizzle/migrations/${name}.sql`, 'utf8'));
  }
}, 30000);
afterAll(async () => { await db?.close(); });
it('isolated SQL rejects 1 EUR and 4 EUR; accepts 5 EUR with private access hash', async () => {
  for (const cents of [100,400,499,501]) {
    await expect(db.query(`INSERT INTO public.live_donations(access_hash,provider,kind,amount_cents) VALUES('test','sumup','calore',$1)`, [cents])).rejects.toThrow();
  }
  await db.query(`INSERT INTO public.live_donations(id,access_hash,provider,provider_id,kind,amount_cents,status) VALUES($1,'test-only','paypal','test-order','calore',500,'pending')`, [id]);
  const rows = await db.query<{ amount_cents: number }>('SELECT amount_cents FROM public.live_donations WHERE id=$1', [id]);
  expect(rows.rows[0]?.amount_cents).toBe(500);
});
it('durable capture claim can be acquired exactly once across concurrent requests', async () => {
  const claims = await Promise.all(Array.from({ length: 8 }, () => db.query<{ claimed: boolean }>('SELECT public.claim_live_capture($1,$2) claimed', [id,'test-order'])));
  expect(claims.filter(r => r.rows[0]?.claimed)).toHaveLength(1);
});
it('concurrent/replayed SQL confirmation returns one persistent ornament, never a duplicate', async () => {
  const query = `SELECT public.confirm_live_donation($1,'paypal','test-order','test-capture',500,'EUR') ornament`;
  const results = await Promise.all(Array.from({ length: 8 }, () => db.query<{ ornament: string }>(query, [id])));
  expect(new Set(results.map(r => r.rows[0]?.ornament)).size).toBe(1);
  const count = await db.query<{ n: number }>('SELECT count(*)::int n FROM public.live_ornaments WHERE donation_id=$1', [id]);
  expect(count.rows[0]?.n).toBe(1);
  await expect(db.query(`SELECT public.confirm_live_donation($1,'paypal','test-order','different-capture',500,'EUR')`, [id])).rejects.toThrow('Payment identity mismatch');
});
it('pending dedication is private, approved consent is public, revoked settlement leaves no tree ornament', async () => {
  await db.query(`UPDATE public.live_ornaments SET firma='private-test',dedica='private-message',publish_consent=true,status='pending' WHERE donation_id=$1`, [id]);
  let tree = await db.query<{ firma: string | null; dedica: string | null }>('SELECT * FROM public.live_public_tree()');
  expect(tree.rows).toHaveLength(1); expect(tree.rows[0]?.firma).toBeNull(); expect(tree.rows[0]?.dedica).toBeNull();
  await db.query(`UPDATE public.live_ornaments SET status='approved' WHERE donation_id=$1`, [id]);
  tree = await db.query('SELECT * FROM public.live_public_tree()');
  expect(tree.rows[0]?.dedica).toBe('private-message');
  await db.query(`UPDATE public.live_donations SET settlement_state='reversed' WHERE id=$1`, [id]);
  expect((await db.query('SELECT * FROM public.live_public_tree()')).rows).toHaveLength(0);
});
it('anonymous and signed-in roles cannot read private records or confirm gifts', async () => {
  for (const role of ['anon','authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    await expect(db.query('SELECT * FROM public.live_donations')).rejects.toThrow('permission denied');
    await expect(db.query('SELECT * FROM public.live_ornaments')).rejects.toThrow('permission denied');
    await expect(db.query(`SELECT public.confirm_live_donation($1,'paypal','test-order','test-capture',500,'EUR')`,[id])).rejects.toThrow('permission denied');
    await db.exec('RESET ROLE');
  }
});
it('SQL recovery leases each row once and never claims exhausted attempts', async () => {
  await db.exec(`INSERT INTO public.live_donations(access_hash,provider,provider_id,kind,amount_cents,status,created_at,recovery_attempts) VALUES('test','sumup','recoverable','calore',500,'pending',now()-interval '5 minutes',0),('test','sumup','exhausted','calore',500,'pending',now()-interval '5 minutes',8)`);
  const claimed = await db.query<{ provider_id: string; recovery_attempts: number }>('SELECT * FROM public.claim_live_recovery()');
  expect(claimed.rows.map(r => r.provider_id)).toEqual(['recoverable']);
  expect(claimed.rows[0]?.recovery_attempts).toBe(1);
  expect((await db.query('SELECT * FROM public.claim_live_recovery()')).rows).toHaveLength(0);
});