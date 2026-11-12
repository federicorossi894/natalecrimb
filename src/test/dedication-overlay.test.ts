// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("dedication overlay contrast and tree visibility", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
  const scrim = css.match(/\.dedication-scrim\s*\{([^}]*)\}/)?.[1] ?? "";
  it("keeps the tree sharp instead of blurring everything behind the message", () => {
    expect(scrim).toContain("background:");
    expect(scrim).not.toMatch(/(?:backdrop-filter|\bfilter)\s*:/);
    expect(css).not.toMatch(/\.dedication-scrim\s*\{[^}]*backdrop-filter\s*:/);
  });
  it("uses a light translucent scrim while the dedication remains legible", () => {
    expect(scrim).toMatch(/rgba\(7,21,19,\.20\)/);
    expect(css).toMatch(/\.dedication-panel\s*\{[^}]*background:/);
  });
});
