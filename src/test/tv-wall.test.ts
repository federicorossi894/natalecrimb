import { describe, expect, it } from "vitest";
import { layoutWall, WALL, WALL_WIDTH, wallSize } from "@/lib/tv-wall";
import { DEMO_WISHES, type PublicWish } from "@/lib/wishes";

const make = (n: number, len: (i: number) => number): PublicWish[] =>
  Array.from({ length: n }, (_, i) => ({ id: `w${i}`, body: "a".repeat(len(i)), nickname: null }));
const mixed = make(30, (i) => [20, 60, 180, 40, 120][i % 5]!);

describe("TV panoramic wish wall", () => {
  it("uses at most 5 twine lines and never more than the screen holds", () => {
    const { rows } = layoutWall(mixed);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.length).toBeLessThanOrEqual(5);
    for (const r of rows) expect(r.y + r.height).toBeLessThanOrEqual(WALL.bottom + 0.001);
  });

  it("gives long wishes wider paper than short ones", () => {
    expect(wallSize("Buon Natale!")).toBe("s");
    expect(wallSize("a".repeat(180))).toBe("l");
    expect(WALL_WIDTH.l).toBeGreaterThan(WALL_WIDTH.s);
  });

  it("keeps notes side by side without overlap, rows apart, and the QR block free", () => {
    const { rows } = layoutWall(mixed);
    rows.forEach((r, k) => {
      const width = r.notes.reduce((s, n) => s + n.width, 0) + WALL.gap * (r.notes.length - 1);
      expect(width).toBeLessThanOrEqual(r.right - WALL.left);
      if (r.y + r.height > WALL.qrTop) expect(r.right).toBe(WALL.shortRight);
      const next = rows[k + 1];
      if (next) expect(next.y).toBeGreaterThanOrEqual(r.y + r.height);
    });
  });

  it("adapts the number of lines to how many wishes there are", () => {
    expect(layoutWall(make(3, () => 30)).rows.length).toBe(1);
    expect(layoutWall(DEMO_WISHES).rows.length).toBeGreaterThanOrEqual(2);
  });

  it("reports how many wishes it placed, in order", () => {
    const { rows, used } = layoutWall(mixed);
    const placed = rows.flatMap((r) => r.notes.map((n) => n.wish.id));
    expect(placed).toEqual(mixed.slice(0, used).map((w) => w.id));
  });
});
