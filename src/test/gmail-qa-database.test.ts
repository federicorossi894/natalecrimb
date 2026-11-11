// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const actor = "00000000-0000-4000-8000-000000000001";
let n = 10;
const request = () => `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid,email text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz); CREATE TABLE public.user_roles(user_id uuid,role text); INSERT INTO public.user_roles VALUES('${actor}','moderator');`,
  );
  await db.exec(await readFile("drizzle/migrations/0014_staff_gmail_qa_audit.sql", "utf8"));
  await db.exec(await readFile('drizzle/migrations/0019_email_qa_verified_owner.sql','utf8'));
  await db.exec(await readFile('drizzle/migrations/0022_email_qa_natale_owner.sql','utf8'));
  await db.exec(`select set_config('request.jwt.claims','{"role":"service_role"}',false)`);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("ordinary actor cannot claim", async () => {
  await expect(
    db.query("select public.claim_staff_gmail_qa($1,$2,'receipt')", [request(), request()]),
  ).rejects.toThrow("Staff only");
});
it("ten concurrent attempts have one claim and durable ten-minute global limit", async () => {
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      db.query<{ id: string | null }>("select public.claim_staff_gmail_qa($1,$2,'receipt') id", [
        actor,
        request(),
      ]),
    ),
  );
  expect(results.filter((r) => r.rows[0]?.id)).toHaveLength(1);
});
it("same request cannot replay after interval; unknown and failures still consume budget", async () => {
  const row = (
    await db.query<{ id: string; request_id: string }>(
      "select id,request_id from public.staff_qa_attempts",
    )
  ).rows[0];
  await db.query("select public.finish_staff_gmail_qa($1,'unknown')", [row?.id]);
  await db.exec("update public.staff_qa_attempts set created_at=now()-interval '11 minutes'");
  expect(
    (
      await db.query<{ id: string | null }>(
        "select public.claim_staff_gmail_qa($1,$2,'receipt') id",
        [actor, row?.request_id],
      )
    ).rows[0]?.id,
  ).toBeNull();
  for (let i = 0; i < 2; i++) {
    expect(
      (
        await db.query<{ id: string | null }>(
          "select public.claim_staff_gmail_qa($1,$2,'gift_now') id",
          [actor, request()],
        )
      ).rows[0]?.id,
    ).toBeTruthy();
    await db.exec("update public.staff_qa_attempts set created_at=now()-interval '11 minutes'");
  }
  expect(
    (
      await db.query<{ id: string | null }>(
        "select public.claim_staff_gmail_qa($1,$2,'christmas_simulation') id",
        [actor, request()],
      )
    ).rows[0]?.id,
  ).toBeNull();
});
it("anon and authenticated cannot view or invoke audit", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await expect(db.query("select * from public.staff_qa_attempts")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query("select public.claim_staff_gmail_qa($1,$2,'receipt')", [actor, request()]),
    ).rejects.toThrow("permission denied");
    await db.exec("reset role");
  }
});
it('confirmed exact owner with volunteer role can claim QA without wider roles', async () => {
  const owner='00000000-0000-4000-8000-000000000002';
  await db.exec(`TRUNCATE public.staff_qa_attempts; INSERT INTO auth.users VALUES('${owner}','federico.rossi@crimonza.org',now(),NULL,NULL); INSERT INTO public.user_roles VALUES('${owner}','volunteer');`);
  const r=await db.query<{id:string}>('select public.claim_staff_gmail_qa($1,$2,$3) id',[owner,request(),'receipt']);
  expect(r.rows[0]?.id).toBeTruthy();  expect((await db.query<{role:string}>('select role from public.user_roles where user_id=$1',[owner])).rows.map(r=>r.role)).toEqual(['volunteer']);
});
it('unconfirmed, foreign volunteer, deleted and shared-session actors cannot claim', async () => {
  for (const [email,confirmed,deleted] of [['foreign@example.org',true,false],['federico.rossi@crimonza.org',false,false],['federico.rossi@crimonza.org',true,true]] as const) {
    const id=request();
    await db.query('insert into auth.users values($1,$2,$3,$4,NULL)',[id,email,confirmed?new Date():null,deleted?new Date():null]);
    await db.query("insert into public.user_roles values($1,'volunteer')",[id]);
    await expect(db.query("select public.claim_staff_gmail_qa($1,$2,'receipt')",[id,request()])).rejects.toThrow('Staff only');
  }
  await expect(db.query("select public.claim_staff_gmail_qa($1,$2,'receipt')",[request(),request()])).rejects.toThrow('Staff only');
});
it('even spoofed owner actor cannot bypass service-only claim guard',async()=>{
  await db.exec(`select set_config('request.jwt.claims','{"role":"authenticated"}',false)`);
  await expect(db.query("select public.claim_staff_gmail_qa($1,$2,'receipt')",[actor,request()])).rejects.toThrow('Server only');
  await db.exec(`select set_config('request.jwt.claims','{"role":"service_role"}',false)`);
});
