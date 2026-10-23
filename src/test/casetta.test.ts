import { describe, expect, it } from "vitest";
import { CASETTA, CASETTA_PRODUCTS } from "@/lib/casetta";

const byId = (id: string) => CASETTA_PRODUCTS.find((p) => p.id === id)!;

describe("Casetta shop window (confirmed by the Comitato)", () => {
  it("lists exactly the four confirmed products", () => {
    expect(CASETTA_PRODUCTS.map((p) => p.id)).toEqual(["cioccolatini", "panettone-carta", "panettone-latta", "pandoro-latta"]);
  });
  it("chocolate tin costs 7 € and shows no invented weight", () => {
    expect(byId("cioccolatini").price).toBe(7);
    expect(byId("cioccolatini").format).not.toMatch(/\d+\s?g/);
  });
  it("panettone 750 g in paper box costs 10 €", () => {
    expect(byId("panettone-carta").price).toBe(10);
    expect(byId("panettone-carta").format).toContain("750 g");
  });
  it("panettone 750 g in tin costs 12 €", () => {
    expect(byId("panettone-latta").price).toBe(12);
    expect(byId("panettone-latta").format).toContain("750 g");
  });
  it("pandoro 750 g in tin costs 12 €", () => {
    expect(byId("pandoro-latta").price).toBe(12);
    expect(byId("pandoro-latta").format).toContain("750 g");
  });
  it("runs from 21 November to 6 January", () => {
    expect(CASETTA.from).toBe("21 novembre");
    expect(CASETTA.until).toBe("6 gennaio");
  });
});
