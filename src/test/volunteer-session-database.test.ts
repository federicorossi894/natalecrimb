// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
const tokenA = "a".repeat(64);
const tokenB = "b".repeat(64);
const client = "00000000-0000-4000-8000-000000000003";

async function svc<T>(sql: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`SET LOCAL ROLE service_role; SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);`);
    return (await tx.query<T>(sql, params)).rows;
  });
}
const vol = (token: string, name: string, args: object) =>
  svc<{ r: unknown }>("SELECT public.campaign_volunteer_dispatch($1,$2,$3::jsonb) r", [token, name, JSON.stringify(args)]).then((x) => x[0]?.r);
const demo = (name: string, args: object) =>
  svc<{ r: unknown }>("SELECT public.campaign_demo_dispatch($1,$2::jsonb,NULL) r", [name, JSON.stringify(args)]).then((x) => x[0]?.r);

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;`);
  for (const tag of ["0000_migration", "0002_add_volunteer_role", "0003_cash_requests_and_volunteers", "0004_cash_request_result", "0005_minimum_donation_5_euro", "0006_restore_cash_request_min_5", "0007_kindness_calendar_and_wishes", "0008_campaign_demo_server_boundary", "0015_volunteer_shared_sessions", "0016_volunteer_shared_wish_token"])
    await db.exec(await readFile(`drizzle/migrations/${tag}.sql`, "utf8"));
  await svc("SELECT * FROM public.volunteer_session_open($1,$2,12)", [tokenA, "  Maria   Rossi "]);
  await svc("SELECT * FROM public.volunteer_session_open($1,$2,12)", [tokenB, "Luca Bianchi"]);
}, 30000);
afterAll(async () => { await db?.close(); });

it("opens a named session without any auth.users row", async () => {
  const [s] = await svc<{ display_name: string }>("SELECT * FROM public.volunteer_session_get($1)", [tokenA]);
  expect(s?.display_name).toBe("Maria Rossi");
  const [u] = (await db.query<{ n: number }>("SELECT count(*)::int n FROM auth.users")).rows;
  expect(u?.n).toBe(0);
  await expect(svc("SELECT * FROM public.volunteer_session_open($1,$2,12)", ["c".repeat(64), "Maria"])).rejects.toThrow();
});

it("unknown or revoked sessions and non-allowlisted operations are refused", async () => {
  await expect(vol("f".repeat(64), "cash_request_lookup", { _code: "X" })).rejects.toThrow(/Unauthorized/);
  for (const name of ["moderate_wish", "hang_ornament", "create_cash_request", "submit_wish", "staff_gmail_qa"])
    await expect(vol(tokenA, name, {})).rejects.toThrow(/Unauthorized/);
  await expect(db.query("SELECT public.campaign_volunteer_dispatch($1,'cash_request_lookup','{}')", [tokenA])).rejects.toThrow();
});

it("two concurrent confirmations create one ornament and audit the session name", async () => {
  const rows = (await demo("create_cash_request", { _kind: "calore", _amount_cents: 500, _firma: "", _dedica: "", _consent: false, _client: client })) as { code: string }[];
  const code = rows[0]!.code;
  const [look] = (await vol(tokenA, "cash_request_lookup", { _code: code })) as { status: string }[];
  expect(look?.status).toBe("pending");
  const [a, b] = (await Promise.all([
    vol(tokenA, "confirm_cash_request", { _code: code, _method: "cash" }),
    vol(tokenB, "confirm_cash_request", { _code: code, _method: "cash" }),
  ])) as { result: string; ornament_id: string }[][];
  expect([a![0]!.result, b![0]!.result].sort()).toEqual(["already_confirmed", "confirmed"]);
  expect(a![0]!.ornament_id).toBe(b![0]!.ornament_id);
  const [n] = (await db.query<{ n: number }>("SELECT count(*)::int n FROM public.demo_ornaments")).rows;
  expect(n?.n).toBe(1);
  const audit = (await db.query<{ display_name: string; result: string }>("SELECT display_name,result FROM public.volunteer_audit WHERE action='confirm_cash_request' ORDER BY id")).rows;
  expect(audit.map((x) => x.result).sort()).toEqual(["already_confirmed", "confirmed"]);
  const [who] = (await db.query<{ display_name: string }>("SELECT s.display_name FROM public.cash_requests c JOIN public.volunteer_sessions s ON s.id=c.confirmed_by")).rows;
  expect(["Maria Rossi", "Luca Bianchi"]).toContain(who?.display_name);
});

it("manual ornament works for the session and logout revokes it", async () => {
  const r = (await vol(tokenB, "volunteer_add_ornament", { _kind: "dae", _amount_cents: 1000, _firma: "", _dedica: "", _consent: false, _method: "pos_manual" })) as { id: string }[];
  expect(r[0]?.id).toBeTruthy();
  await svc("SELECT public.volunteer_session_close($1)", [tokenB]);
  await expect(vol(tokenB, "cash_request_lookup", { _code: "X" })).rejects.toThrow(/Unauthorized/);
});

it("shared session creates a one-time wish code usable by the customer, audited by name", async () => {
  await expect(vol("e".repeat(64), "create_wish_token", {})).rejects.toThrow(/Unauthorized/);
  await expect(db.query("SELECT public.create_wish_token()")).rejects.toThrow();
  const [t] = (await vol(tokenA, "create_wish_token", {})) as { code: string; expires_at: string }[];
  expect(t?.code).toMatch(/^[A-Z0-9]{16}$/);
  const [stored] = (await db.query<{ n: number }>("SELECT count(*)::int n FROM public.wish_tokens WHERE token_hash = public.cash_code_hash($1)", [t!.code])).rows;
  expect(stored?.n).toBe(1);
  const [plain] = (await db.query<{ n: number }>("SELECT count(*)::int n FROM public.wish_tokens WHERE token_hash = $1", [t!.code])).rows;
  expect(plain?.n).toBe(0);
  const [look] = (await db.query<{ state: string }>("SELECT * FROM public.wish_lookup($1)", [t!.code])).rows;
  expect(look?.state).toBe("available");
  const [a] = (await db.query<{ display_name: string }>("SELECT display_name FROM public.volunteer_audit WHERE action='create_wish_token'")).rows;
  expect(a?.display_name).toBe("Maria Rossi");
});

it("login rate limit blocks after repeated failures", async () => {
  for (let i = 0; i < 8; i++) await svc("SELECT public.volunteer_login_record('ip1',false)");
  const [x] = await svc<{ ok: boolean }>("SELECT public.volunteer_login_allowed('ip1') ok");
  const [y] = await svc<{ ok: boolean }>("SELECT public.volunteer_login_allowed('ip2') ok");
  expect(x?.ok).toBe(false);
  expect(y?.ok).toBe(true);
});
