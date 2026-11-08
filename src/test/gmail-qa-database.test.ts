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
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE TABLE public.user_roles(user_id uuid,role text); INSERT INTO public.user_roles VALUES('${actor}','moderator');`,
  );
  await db.exec(await readFile("drizzle/migrations/0014_staff_gmail_qa_audit.sql", "utf8"));
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
