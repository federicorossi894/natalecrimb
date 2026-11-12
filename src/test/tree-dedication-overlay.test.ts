import { describe, expect, it } from "vitest";
import styles from "../styles.css?raw";

describe("selected ornament dedication overlay", () => {
  it("keeps the 3D tree sharp behind the dedication, including on iOS Safari", () => {
    const rule = /\.dedication-scrim\s*\{([^}]*)\}/.exec(styles)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toContain("backdrop-filter: none");
    expect(rule).toContain("-webkit-backdrop-filter: none");
    expect(rule).not.toMatch(/blur\s*\(/);
    const alpha = /background:\s*rgba\(7,21,19,\s*([\d.]+)\)/.exec(rule ?? "");
    expect(alpha).not.toBeNull();
    expect(Number(alpha?.[1])).toBeLessThan(0.4);
  });
});
