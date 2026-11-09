// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { afterAll,beforeAll,it,expect } from 'vitest';
let db:PGlite;
const req='00000000-0000-4000-8000-000000000001',client='00000000-0000-4000-8000-000000000002';
beforeAll(async()=>{
  db=new PGlite({extensions:{pgcrypto}});
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA extensions;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;`);
  for(const name of ['0000_migration','0002_add_volunteer_role','0003_cash_requests_and_volunteers','0004_cash_request_result','0005_minimum_donation_5_euro','0006_restore_cash_request_min_5','0008_campaign_demo_server_boundary','0018_online_gift_idempotency'])await db.exec(await readFile(`drizzle/migrations/${name}.sql`,'utf8'));
},30000);
afterAll(async()=>await db.close());
const call=(r=req,c=client,amount=500)=>db.transaction(async tx=>{
  await tx.exec(`SELECT set_config('request.jwt.claims','{"role":"service_role"}',true)`);
  return (await tx.query<{id:string}>(`select * from public.hang_online_gift($1,$2,'calore',$3)`,[r,c,amount])).rows[0]?.id;
});
it('simultaneous confirmation and reload return exactly one bauble',async()=>{
  const ids=await Promise.all(Array.from({length:8},()=>call()));expect(new Set(ids).size).toBe(1);expect(ids[0]).toMatch(/^[a-f0-9-]{36}$/);
  const rows=await db.query<{firma:null;dedica:null;publish_consent:boolean}>(`select firma,dedica,publish_consent from demo_ornaments`);
  expect(rows.rows).toEqual([{firma:null,dedica:null,publish_consent:false}]);
  expect(await call()).toBe(ids[0]);
});
it('request ID cannot be rebound to different client or amount',async()=>{await expect(call(req,'00000000-0000-4000-8000-000000000003')).rejects.toThrow('Request mismatch');await expect(call(req,client,1000)).rejects.toThrow('Request mismatch');});
it('server minimum is 5 EUR independently of UI',async()=>{await expect(call('00000000-0000-4000-8000-000000000004',client,400)).rejects.toThrow('Importo');});
it('public and signed-in Data API cannot call the one-shot privileged function',async()=>{for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await expect(db.query(`select * from public.hang_online_gift($1,$2,'calore',500)`,[req,client])).rejects.toThrow('permission denied');await db.exec('reset role');}});