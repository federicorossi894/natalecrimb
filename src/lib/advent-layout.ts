/**
 * Calendario dell'Avvento illustrato: the 24 plaques sit on the approved illustration of the CRI Monza sede.
 * Coordinates are the outer bounds (gold rim included) measured in pixels on the 1920×1280 approved reference
 * with the numbers, so every plaque stays on its window/door at any size. Order follows the user's layout.
 */
export const SEDE_W = 1920;
export const SEDE_H = 1280;
export const SEDE_RATIO = SEDE_W / SEDE_H; // 3:2

type Px = { day: number; x: number; y: number; w: number; h: number };
const PX: Px[] = [
  { day: 1, x: 192, y: 883, w: 74, h: 99 },
  { day: 2, x: 696, y: 773, w: 74, h: 97 },
  { day: 3, x: 353, y: 405, w: 76, h: 98 },
  { day: 4, x: 1622, y: 1055, w: 74, h: 98 },
  { day: 5, x: 705, y: 519, w: 74, h: 98 },
  { day: 6, x: 597, y: 329, w: 70, h: 98 },
  { day: 7, x: 463, y: 567, w: 66, h: 99 },
  { day: 8, x: 84, y: 883, w: 75, h: 98 },
  { day: 9, x: 567, y: 773, w: 71, h: 97 },
  { day: 10, x: 1379, y: 773, w: 90, h: 97 },
  { day: 11, x: 346, y: 591, w: 88, h: 98 },
  { day: 12, x: 310, y: 883, w: 91, h: 99 },
  { day: 13, x: 1694, y: 932, w: 91, h: 98 },
  { day: 14, x: 470, y: 367, w: 84, h: 98 },
  { day: 15, x: 981, y: 430, w: 91, h: 98 },
  { day: 16, x: 581, y: 543, w: 86, h: 98 },
  { day: 17, x: 1353, y: 357, w: 90, h: 98 },
  { day: 18, x: 959, y: 193, w: 91, h: 98 },
  { day: 19, x: 1396, y: 1032, w: 90, h: 98 },
  { day: 20, x: 489, y: 883, w: 116, h: 99 },
  { day: 21, x: 710, y: 280, w: 86, h: 99 },
  { day: 22, x: 1533, y: 748, w: 91, h: 98 },
  { day: 23, x: 1513, y: 318, w: 90, h: 98 },
  { day: 24, x: 981, y: 870, w: 91, h: 97 },
];

/** Plaque bounds as fractions (0–1) of the illustration, sorted by day. */
export type Plaque = { day: number; left: number; top: number; width: number; height: number; cx: number; cy: number };
export const PLAQUES: Plaque[] = PX.map((p) => ({
  day: p.day,
  left: p.x / SEDE_W,
  top: p.y / SEDE_H,
  width: p.w / SEDE_W,
  height: p.h / SEDE_H,
  cx: (p.x + p.w / 2) / SEDE_W,
  cy: (p.y + p.h / 2) / SEDE_H,
}));
export const plaqueOf = (day: number) => PLAQUES.find((p) => p.day === day);

export const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

/**
 * TV camera for the 12:00 moment, in container units of a 16:9 frame (100 × 56.25 cqw).
 * The 3:2 illustration is contained (never stretched); the focus zoom moves the day's plaque to one side and
 * is clamped so the zoomed illustration always covers the frame. The message panel goes on the other side.
 */
export const FRAME_W = 100;
export const FRAME_H = 56.25;
export const STAGE_W = FRAME_H * SEDE_RATIO; // 84.375
export const STAGE_LEFT = (FRAME_W - STAGE_W) / 2;
export const FOCUS_ZOOM = 1.85;

export function adventCamera(day: number, k = FOCUS_ZOOM) {
  const p = plaqueOf(day) ?? plaqueOf(24)!;
  const panel: "left" | "right" = p.cx < 0.55 ? "right" : "left";
  const tx = panel === "right" ? 26 : 74;
  const ty = FRAME_H * 0.5;
  const u = p.cx * STAGE_W;
  const v = p.cy * FRAME_H;
  let dx = tx - STAGE_LEFT - k * u;
  let dy = ty - k * v;
  dx = Math.min(-STAGE_LEFT, Math.max(FRAME_W - STAGE_LEFT - k * STAGE_W, dx));
  dy = Math.min(0, Math.max(FRAME_H * (1 - k), dy));
  /** Where the plaque centre lands in the frame (cqw). */
  const fx = STAGE_LEFT + dx + k * u;
  const fy = dy + k * v;
  return { k, dx, dy, panel, fx, fy };
}
