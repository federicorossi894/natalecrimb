// @vitest-environment node
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { constantTimeEqual, makeVerifier, normalizeVolunteerName, parseVerifier, verifyPassword } from "@/lib/volunteer-auth";
import { volunteerVerifier } from "@/lib/volunteer-secret.server";
import { isVolunteerHost } from "@/lib/volunteer-host";

describe("shared volunteer password", () => {
  it("owner verifier parses with 310000 iterations", () => {
    expect(parseVerifier(volunteerVerifier())?.iterations).toBe(310000);
  });
  it("wrong passwords are rejected by the owner verifier", async () => {
    for (const p of ["", "password", "natale2026", "x".repeat(201)]) expect(await verifyPassword(p, volunteerVerifier())).toBe(false);
  }, 30000);
  it("correct password verifies, case/space/punctuation matter", async () => {
    const v = await makeVerifier("Natale Monza!", 1000);
    expect(await verifyPassword("Natale Monza!", v)).toBe(true);
    for (const p of ["natale Monza!", "Natale Monza", "NataleMonza!", " Natale Monza!"]) expect(await verifyPassword(p, v)).toBe(false);
  });
  it("constant-time compare handles length mismatch", () => {
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 0]))).toBe(false);
  });
});

describe("volunteer name", () => {
  it("requires name and surname, no email", () => {
    expect(normalizeVolunteerName("  Maria   Rossi ")).toBe("Maria Rossi");
    expect(normalizeVolunteerName("Anna D'Amico")).toBe("Anna D'Amico");
    expect(normalizeVolunteerName("Maria")).toBeNull();
    expect(normalizeVolunteerName("maria@crimonza.org")).toBeNull();
  });
});

describe("boundaries", () => {
  it("the verifier never appears outside the server-only module", async () => {
    const salt = "SnWqdgflC4XjJhKelpuXlh38kVORCM6p";
    const walk = async (d: string): Promise<string[]> =>
      (await Promise.all((await readdir(d, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])))).flat();
    const hits: string[] = [];
    for (const f of await walk("src")) if (!f.endsWith("volunteer-secret.server.ts") && (await readFile(f, "utf8")).includes(salt)) hits.push(f);
    expect(hits).toEqual([]);
  });
  it("shared-password server functions expose only the three desk operations and set secure cookies", async () => {
    const src = await readFile("src/lib/volunteer-session.functions.ts", "utf8");
    expect(src).toContain("['cash_request_lookup', 'confirm_cash_request', 'volunteer_add_ornament']");
    expect(src).toMatch(/httpOnly: true, secure: true, sameSite: 'lax'/);
    expect(src).not.toMatch(/moderate_wish|create_wish_token|requireSupabaseAuth|signUp|auth\.admin/);
  });
  it("the volunteer page no longer uses account auth", async () => {
    const page = await readFile("src/routes/volontari.tsx", "utf8");
    expect(page).not.toMatch(/supabase\.auth|AuthBox|is_volunteer|campaignRpc|localStorage/);
  });
  it("only the dedicated host is treated as the volunteer portal", () => {
    expect(isVolunteerHost("volontari.natale.crimonza.org")).toBe(true);
    expect(isVolunteerHost("natalecrimb.lovable.app")).toBe(false);
  });
});
