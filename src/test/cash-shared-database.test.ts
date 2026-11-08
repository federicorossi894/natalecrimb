// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
const actor = "00000000-0000-4000-8000-000000000002";
const client = "00000000-0000-4000-8000-000000000003";
let code: string;
let ornamentId: string;
async function rpc<T>(name: string, args: object, staff?: string) {
  return db.transaction(async (tx) => {
    await tx.exec(
      `SET LOCAL ROLE service_role; SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);`,
    );
    const result = await tx.query<{ result: T }>(
      "SELECT public.campaign_demo_dispatch($1,$2::jsonb,$3::uuid) result",
      [name, JSON.stringify(args), staff ?? null],
    );
    return result.rows[0]?.result;
  });
}
beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;`);
  for (const tag of [
    "0000_migration",
    "0002_add_volunteer_role",
    "0003_cash_requests_and_volunteers",
    "0004_cash_request_result",
    "0005_minimum_donation_5_euro",
    "0006_restore_cash_request_min_5",
    "0008_campaign_demo_server_boundary",
  ])
    await db.exec(await readFile(`drizzle/migrations/${tag}.sql`, "utf8"));
  // Synthetic local test identity only, never a role assignment in Cloud.
  await db.query("INSERT INTO auth.users(id) VALUES($1);", [actor]);
  await db.query("INSERT INTO public.user_roles(user_id,role) VALUES($1,'volunteer')", [actor]);
}, 30000);
afterAll(async () => {
  await db?.close();
});

it("phone A creates a 5 EUR Cloud-shaped request, no ornament before staff confirmation", async () => {
  const rows = await rpc<{ code: string; amount_cents: number }[]>("create_cash_request", {
    _kind: "calore",
    _amount_cents: 500,
    _firma: "",
    _dedica: "",
    _consent: false,
    _client: client,
  });
  code = rows?.[0]?.code ?? "";
  expect(code).toHaveLength(16);
  expect(rows?.[0]?.amount_cents).toBe(500);
  expect(await rpc("public_tree", {})).toEqual([]);
});
it("unprivileged and anonymous confirmation and direct RPC bypass are denied", async () => {
  await expect(rpc("confirm_cash_request", { _code: code, _method: "cash" })).rejects.toThrow(
    "Unauthorized",
  );
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    await expect(db.query("SELECT public.confirm_cash_request($1,'cash')", [code])).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query("SELECT public.campaign_demo_dispatch('confirm_cash_request','{}',NULL)"),
    ).rejects.toThrow("permission denied");
    await db.exec("RESET ROLE");
  }
});
it("two concurrent phone B confirmations return exactly one persistent ornament", async () => {
  const results = await Promise.all(
    Array.from({ length: 2 }, () =>
      rpc<{ result: string; ornament_id: string }[]>(
        "confirm_cash_request",
        { _code: code, _method: "cash" },
        actor,
      ),
    ),
  );
  expect(
    results
      .flat()
      .map((r) => r?.result)
      .sort(),
  ).toEqual(["already_confirmed", "confirmed"]);
  ornamentId = results[0]?.[0]?.ornament_id ?? "";
  expect(ornamentId).toMatch(/^[0-9a-f-]{36}$/);
  expect(results[1]?.[0]?.ornament_id).toBe(ornamentId);
});
it("fresh phone A, phone B and TV reads after refresh see the same single ornament and count", async () => {
  for (let device = 0; device < 3; device++) {
    const tree = await rpc<{ id: string }[]>("public_tree", {});
    expect(tree).toHaveLength(1);
    expect(tree?.[0]?.id).toBe(ornamentId);
  }
  const donor = await rpc<{ status: string; ornament_id: string }[]>("cash_request_result", {
    _code: code,
  });
  expect(donor?.[0]?.status).toBe("confirmed");
  expect(donor?.[0]?.ornament_id).toBe(ornamentId);
  expect(
    await rpc("confirm_cash_request", { _code: code, _method: "pos_manual" }, actor),
  ).toMatchObject([{ result: "already_confirmed", ornament_id: ornamentId }]);
});
it("minimum 5 EUR remains enforced by shared cash creation", async () => {
  await expect(
    rpc("create_cash_request", {
      _kind: "cuore",
      _amount_cents: 400,
      _firma: "",
      _dedica: "",
      _consent: false,
      _client: client,
    }),
  ).rejects.toThrow("minimo 5");
});
