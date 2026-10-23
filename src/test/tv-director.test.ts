import { describe, expect, it } from "vitest";
import { TV_DURATION, tvSequence } from "@/components/xmas/TreeTV";

describe("casetta TV director", () => {
  it("shows the dedication scene only when a public (moderated) dedication exists", () => {
    expect(tvSequence(false)).not.toContain("dedica");
    expect(tvSequence(true)).toContain("dedica");
  });

  it("keeps the silent loop between 60 and 90 seconds", () => {
    for (const has of [false, true]) {
      const total = tvSequence(has).reduce((s, b) => s + TV_DURATION[b], 0);
      expect(total).toBeGreaterThanOrEqual(60000);
      expect(total).toBeLessThanOrEqual(90000);
    }
  });

  it("always opens with the invitation", () => {
    expect(tvSequence(false)[0]).toBe("invito");
    expect(tvSequence(true)[0]).toBe("invito");
  });
});
