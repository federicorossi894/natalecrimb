import { describe, expect, it } from "vitest";
import { FRAME_H, FRAME_W, PLAQUES, SEDE_H, SEDE_W, STAGE_LEFT, STAGE_W, adventCamera } from "@/lib/advent-layout";

describe("Advent calendar plaques on the sede illustration", () => {
  it("has exactly 24 plaques numbered 1–24, none missing or duplicated", () => {
    expect(PLAQUES).toHaveLength(24);
    expect(new Set(PLAQUES.map((p) => p.day)).size).toBe(24);
    expect(PLAQUES.map((p) => p.day).sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  });

  it("keeps every plaque inside the illustration and apart from the others", () => {
    for (const p of PLAQUES) {
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.top).toBeGreaterThanOrEqual(0);
      expect(p.left + p.width).toBeLessThanOrEqual(1);
      expect(p.top + p.height).toBeLessThanOrEqual(1);
    }
    for (const a of PLAQUES) for (const b of PLAQUES) {
      if (a.day >= b.day) continue;
      const apart = a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top;
      expect(apart, `${a.day} vs ${b.day}`).toBe(true);
    }
  });

  it("puts 24 on the main door of the sede", () => {
    const p = PLAQUES.find((x) => x.day === 24)!;
    // Main glass door of the reference: about x 950–1120, y 780–1050 px on 1920×1280.
    expect(p.cx * SEDE_W).toBeGreaterThan(950);
    expect(p.cx * SEDE_W).toBeLessThan(1120);
    expect(p.cy * SEDE_H).toBeGreaterThan(780);
    expect(p.cy * SEDE_H).toBeLessThan(1050);
  });

  it("matches the approved reference positions (spot checks)", () => {
    const at = (d: number) => PLAQUES.find((x) => x.day === d)!;
    expect(Math.round(at(18).left * SEDE_W)).toBe(959); // top window
    expect(Math.round(at(8).left * SEDE_W)).toBe(84);   // ambulance, first window
    expect(Math.round(at(4).top * SEDE_H)).toBe(1055);  // motorbike case
  });
});

describe("TV 12:00 camera", () => {
  it("keeps the illustration covering the 16:9 frame and the day's plaque clear of the message panel", () => {
    for (const p of PLAQUES) {
      const c = adventCamera(p.day);
      // Zoomed illustration covers the whole frame (no empty borders).
      expect(STAGE_LEFT + c.dx).toBeLessThanOrEqual(0.001);
      expect(STAGE_LEFT + c.dx + c.k * STAGE_W).toBeGreaterThanOrEqual(FRAME_W - 0.001);
      expect(c.dy).toBeLessThanOrEqual(0.001);
      expect(c.dy + c.k * FRAME_H).toBeGreaterThanOrEqual(FRAME_H - 0.001);
      // The plaque is on screen and on the opposite side of the 41-wide panel (3.5 from the edge).
      const half = (p.width * STAGE_W * c.k) / 2;
      expect(c.fy).toBeGreaterThan(0);
      expect(c.fy).toBeLessThan(FRAME_H);
      if (c.panel === "right") expect(c.fx + half).toBeLessThan(FRAME_W - 3.5 - 41);
      else expect(c.fx - half).toBeGreaterThan(3.5 + 41);
    }
  });
});
