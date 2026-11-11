import { describe, expect, it } from "vitest";
import { CASETTA, CASETTA_PRODUCTS } from "@/lib/casetta";

const byId = (id: string) => CASETTA_PRODUCTS.find((p) => p.id === id)!;

describe("Casetta shop window — assortment and indicative hours", () => {
  it("shows four slots and groups panettone and pandoro into one card", () => {
    expect(CASETTA_PRODUCTS.map((p) => p.id)).toEqual(["panettone-pandoro", "riso", "tisane", "cioccolatini"]);
    expect(byId("panettone-pandoro").name).toBe("Panettone e pandoro");
    expect(byId("panettone-pandoro").photo).toBe("panettoneCarta");
  });
  it("lists rice in 500 g bags, teas and other solidary products", () => {
    expect(byId("riso").format).toContain("500 g");
    expect(byId("tisane").name).toBe("Tisane");
    expect(byId("cioccolatini").name).toContain("altri pensieri");
  });
  it("does not advertise unconfirmed prices or product photos", () => {
    expect(CASETTA_PRODUCTS.every((p) => p.price === undefined)).toBe(true);
    expect(byId("riso").photo).toBe("riso");
    expect(byId("tisane").photo).toBe("tisane");
  });
  it("shows Christmas village dates and non-binding hours", () => {
    expect(CASETTA.from).toBe("21 novembre");
    expect(CASETTA.until).toBe("6 gennaio");
    expect(CASETTA.openingHours).toContain("10:00–18:00");
    expect(CASETTA.openingHours).toContain("possibili variazioni");
  });
});
