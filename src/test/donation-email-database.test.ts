// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite;
const id = "00000000-0000-4000-8000-000000000010";
beforeAll(async () => {
  db = new PGlite();
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;");
  for (const name of [
    "0010_live_donation_checkout_and_atomic_ornaments",
    "0011_lock_live_payment_tables_to_server",
    "0012_live_payment_capture_claim_and_recovery",
    "0013_donation_private_email_intents",
  ])
    await db.exec(await readFile(`drizzle/migrations/${name}.sql`, "utf8"));
  await db.query(
    `INSERT INTO public.live_donations(id,access_hash,provider,provider_id,kind,amount_cents,status,donor_email_requested,donor_email_private,donor_email_state) VALUES($1,'mock-private','sumup','mock-order-email','calore',500,'pending',true,'mock@example.org','blocked')`,
    [id],
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("pending cannot claim receipt and invalid opt-in is rejected by SQL", async () => {
  expect(
    (
      await db.query<{ c: string | null }>(
        `SELECT public.claim_donation_email($1,'receipt',false) c`,
        [id],
      )
    ).rows[0]?.c,
  ).toBeNull();
  await expect(
    db.query(`UPDATE public.live_donations SET donor_email_private='invalid' WHERE id=$1`, [id]),
  ).rejects.toThrow();
});
it("paid donation has one atomic receipt claim across ten simultaneous requests", async () => {
  await db.query(
    `SELECT public.confirm_live_donation($1,'sumup','mock-order-email','mock-payment-email',500,'EUR')`,
    [id],
  );
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      db.query<{ c: string | null }>(`SELECT public.claim_donation_email($1,'receipt',false) c`, [
        id,
      ]),
    ),
  );
  const claims = results.map((r) => r.rows[0]?.c).filter(Boolean);
  expect(claims).toHaveLength(1);
  const r = await db.query<{ donor_email_attempts: number; donor_email_audit: unknown[] }>(
    "SELECT donor_email_attempts,donor_email_audit FROM public.live_donations WHERE id=$1",
    [id],
  );
  expect(r.rows[0]?.donor_email_attempts).toBe(1);
  expect(r.rows[0]?.donor_email_audit).toHaveLength(1);
});
it("failed attempt needs explicitly authorized retry and has a bounded maximum", async () => {
  let current = await db.query<{ donor_email_claim: string }>(
    "SELECT donor_email_claim FROM public.live_donations WHERE id=$1",
    [id],
  );
  await db.query(`SELECT public.finish_donation_email($1,'receipt',$2,'failed')`, [
    id,
    current.rows[0]?.donor_email_claim,
  ]);
  expect(
    (
      await db.query<{ c: string | null }>(
        `SELECT public.claim_donation_email($1,'receipt',false) c`,
        [id],
      )
    ).rows[0]?.c,
  ).toBeNull();
  for (let i = 0; i < 2; i++) {
    const c = (
      await db.query<{ c: string }>(`SELECT public.claim_donation_email($1,'receipt',true) c`, [id])
    ).rows[0]?.c;
    expect(c).toBeTruthy();
    await db.query(`SELECT public.finish_donation_email($1,'receipt',$2,'failed')`, [id, c]);
  }
  expect(
    (
      await db.query<{ c: string | null }>(
        `SELECT public.claim_donation_email($1,'receipt',true) c`,
        [id],
      )
    ).rows[0]?.c,
  ).toBeNull();
  current = await db.query("SELECT donor_email_claim FROM public.live_donations WHERE id=$1", [id]);
  expect(current.rows).toHaveLength(1);
});
it("explicit opt-out clears private address and stops future claims", async () => {
  await db.query(
    `UPDATE public.live_donations SET donor_email_requested=false,donor_email_private=NULL,donor_email_state='cancelled' WHERE id=$1`,
    [id],
  );
  expect(
    (
      await db.query<{ c: string | null }>(
        `SELECT public.claim_donation_email($1,'receipt',true) c`,
        [id],
      )
    ).rows[0]?.c,
  ).toBeNull();
  const tree = await db.query("SELECT * FROM public.live_public_tree()");
  expect(tree.rows).toHaveLength(1);
  expect(tree.rows[0]).not.toHaveProperty("donor_email_private");
});
it("accepted gift clears recipient/message and cannot be duplicated", async () => {
  await db.query(
    `UPDATE public.live_donations SET gift_email_private='gift@example.org',gift_email_data='{"msg":"mock-only"}',gift_email_state='blocked' WHERE id=$1`,
    [id],
  );
  const c = (
    await db.query<{ c: string }>(`SELECT public.claim_donation_email($1,'gift',false) c`, [id])
  ).rows[0]?.c;
  await db.query(`SELECT public.finish_donation_email($1,'gift',$2,'accepted')`, [id, c]);
  const d = (
    await db.query<{
      gift_email_private: string | null;
      gift_email_data: unknown;
      gift_email_state: string;
    }>(
      "SELECT gift_email_private,gift_email_data,gift_email_state FROM public.live_donations WHERE id=$1",
      [id],
    )
  ).rows[0];
  expect(d?.gift_email_private).toBeNull();
  expect(d?.gift_email_data).toBeNull();
  expect(d?.gift_email_state).toBe("accepted");
  expect(
    (
      await db.query<{ c: string | null }>(`SELECT public.claim_donation_email($1,'gift',true) c`, [
        id,
      ])
    ).rows[0]?.c,
  ).toBeNull();
});
it("anon and authenticated cannot see addresses or acquire claims", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    await expect(db.query("SELECT donor_email_private FROM public.live_donations")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query(`SELECT public.claim_donation_email($1,'receipt',true)`, [id]),
    ).rejects.toThrow("permission denied");
    await db.exec("RESET ROLE");
  }
});
