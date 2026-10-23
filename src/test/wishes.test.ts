import { describe, expect, it } from "vitest";
import { DEMO_UNTIL, DEMO_WISH_CODE, WISH_MAX, contactHints, createDemoWishApi, wallWishes, wishSchema } from "@/lib/wishes";

describe("Muro degli auguri rules", () => {
  it("accepts at most 180 characters", () => {
    expect(WISH_MAX).toBe(180);
    expect(wishSchema.safeParse({ body: "a".repeat(180), nickname: "", consent: true }).success).toBe(true);
    expect(wishSchema.safeParse({ body: "a".repeat(181), nickname: "", consent: true }).success).toBe(false);
  });

  it("requires explicit consent to publish", () => {
    expect(wishSchema.safeParse({ body: "Buon Natale Monza", nickname: "", consent: false }).success).toBe(false);
  });

  it("keeps the nickname optional", () => {
    expect(wishSchema.safeParse({ body: "Buon Natale Monza", nickname: "", consent: true }).success).toBe(true);
  });

  it("hints at contacts and links without blocking", () => {
    expect(contactHints("scrivimi a mario@example.it")).toContain("un indirizzo email");
    expect(contactHints("chiama 333 123 4567")).toContain("un numero di telefono");
    expect(contactHints("Buon Natale a tutti")).toEqual([]);
  });

  it("a code writes one wish only (demo twin of the server rule)", async () => {
    const api = createDemoWishApi();
    expect((await api.submit(DEMO_WISH_CODE, "Auguri!", "", true)).result).toBe("ok");
    expect((await api.submit(DEMO_WISH_CODE, "Ancora", "", true)).result).toBe("already_used");
  });

  it("shows labelled examples only while there are fewer than 12 real wishes", () => {
    const real = Array.from({ length: DEMO_UNTIL }, (_, i) => ({ id: String(i), body: "x", nickname: null }));
    expect(wallWishes(real.slice(0, 3)).some((w) => w.demo)).toBe(true);
    expect(wallWishes(real).some((w) => w.demo)).toBe(false);
  });
});
