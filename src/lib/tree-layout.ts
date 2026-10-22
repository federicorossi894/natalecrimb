import type { TreeOrnament } from './data';

/** Grows from a complete small fir (few gifts) to a spectacular tree at 200 demo gifts. */
export function treeHeight(count: number) { return 1.8 + 2.8 * Math.sqrt(clampCount(count) / 200); }
/** Canopy gets proportionally wider (fuller silhouette) as gifts accumulate. */
export function treeWidth(count: number) { return 1 + 0.18 * Math.sqrt(clampCount(count) / 200); }
function clampCount(count: number) { return Math.min(200, Math.max(0, count)); }

/* ---------- Canopy profile shared by the mesh builder and the ornament placement ---------- */
export type Tier = { yb: number; th: number; rl: number; lobes: number; phase: number };
export function canopyTiers(height: number, count: number): Tier[] {
  const n = clampCount(count), T = 7 + Math.floor(n / 25), w = treeWidth(count), tiers: Tier[] = [];
  for (let k = 0; k < T; k++) {
    const f = k / (T - 1), yb = (0.08 + Math.pow(f, 0.92) * 0.76) * height, th = height * (0.2 - 0.045 * f);
    const rl = height * w * (0.4 * Math.pow(1 - yb / height, 1.05) + 0.03);
    tiers.push({ yb, th, rl, lobes: Math.max(6, Math.round(rl / height * 40)), phase: k * 0.77 });
  }
  return tiers;
}
export const lobeAt = (t: Tier, a: number) => Math.pow(Math.abs(Math.sin((a - t.phase) * t.lobes / 2)), 0.7);
/** Outer radius of the needle surface at height y and angle a (max over overlapping skirts, incl. bough tufts). */
export function surfaceRadius(tiers: Tier[], height: number, y: number, a: number) {
  let r = 0;
  for (const t of tiers) {
    const lobe = lobeAt(t, a), shape = 0.86 + 0.14 * lobe;
    if (y > t.yb + t.th) continue;
    if (y >= t.yb) r = Math.max(r, t.rl * Math.pow(Math.pow(1 - (y - t.yb) / t.th, 2 / 3), 0.85) * shape);
    else if (y >= t.yb - t.th * 0.16 * lobe - height * 0.012) r = Math.max(r, t.rl * shape + height * 0.02 * lobe);
  }
  return r;
}

/* ---------- Ornament placement ---------- */
/** Clearance ellipsoid in bauble radii: a bauble is ~2R wide (+ dedication tag on one side) and spans -R..+2R with cap/ribbon. */
const GAP_H = 2.6, GAP_V = 3.2;
const LEVEL_LO = 0.12, LEVEL_HI = 0.83, TRIES = 72;
const envelope = (level: number) => 0.4 * Math.pow(1 - level, 1.05) + 0.03;
/** Bauble radius as a fraction of tree height for a tree holding `count` gifts: as large as possible, small enough to fit. */
export function baubleRatio(count: number) {
  const n = Math.max(1, count), w = treeWidth(n);
  const legible = 0.07 / (1 + Math.sqrt(Math.min(n, 200) / 200) * 0.55);
  // Usable outer area (units of height²) between the placement levels; random sequential packing saturates near 55%.
  const area = Math.PI * w * (envelope(LEVEL_LO) + envelope(LEVEL_HI)) * Math.hypot(LEVEL_HI - LEVEL_LO, w * (envelope(LEVEL_LO) - envelope(LEVEL_HI)));
  const fit = Math.sqrt((0.5 * area) / (n * GAP_H * GAP_V * (Math.PI / 4) * 1.15));
  return Math.min(legible, fit);
}
type Slot = { level: number; angle: number };
const slots: Slot[] = [];
const frac = (x: number) => x - Math.floor(x);
/**
 * Slot i depends only on slots 0..i-1 and on the bauble size the tree had when gift i arrived, so every existing
 * gift keeps its place when a new one lands. Candidates come from the R2 low-discrepancy sequence (no rows, no
 * golden-angle helix); the candidate with the most 3D clearance wins (best-candidate sampling).
 */
function slotAt(i: number): Slot {
  while (slots.length <= i) {
    const j = slots.length, k = baubleRatio(j + 1), w = treeWidth(j + 1);
    const pos = (s: Slot) => { const r = w * envelope(s.level); return [Math.sin(s.angle) * r, s.level, Math.cos(s.angle) * r] as const; };
    const placed = slots.map(pos);
    let best: Slot = { level: 0.45, angle: 0 }, bestScore = -Infinity;
    const lo = Math.pow(1 - LEVEL_HI, 2), hi = Math.pow(1 - LEVEL_LO, 2);
    for (let c = 0; c < TRIES; c++) {
      const s = j * TRIES + c + 1;
      const level = 1 - Math.sqrt(lo + frac(0.5 + s * 0.7548776662) * (hi - lo)); // uniform over cone area
      const angle = frac(0.5 + s * 0.569840291) * Math.PI * 2;
      const p = pos({ level, angle });
      let clear = 3;
      for (const q of placed) clear = Math.min(clear, Math.hypot(Math.hypot(p[0] - q[0], p[2] - q[2]) / (GAP_H * k), (p[1] - q[1]) / (GAP_V * k)));
      // First gifts gather softly toward the front, mid-height, so a young tree reads well from the default view.
      const bias = j < 8 ? 0.45 * Math.cos(angle) - 0.8 * Math.abs(level - 0.45) : 0;
      const score = (clear >= 1 ? 10 : 0) + Math.min(clear, 1.8) + bias;
      if (score > bestScore) { bestScore = score; best = { level, angle }; }
    }
    slots.push(best);
  }
  return slots[i]!;
}

const DISK: [number, number][] = [[0, 0], [-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6], [-0.85, 0], [0.85, 0], [-0.45, -0.45], [-0.45, 0.45], [0.45, -0.45], [0.45, 0.45]];
export type Placement = { pos: [number, number, number]; theta: number; lean: number; R: number };
const cache = new Map<string, Placement[]>();
/** World placement of every gift for a tree holding `count` gifts: hung on the outer needles, never inside them. */
export function treeLayout(count: number, height = treeHeight(count)): Placement[] {
  const key = `${count}:${height.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const tiers = canopyTiers(height, count), R = baubleRatio(count) * height, out: Placement[] = [];
  const sr = (y: number, a: number) => surfaceRadius(tiers, height, y, a);
  for (let i = 0; i < count; i++) {
    const { level, angle } = slotAt(i), y = level * height, da = R / Math.max(0.2, sr(y, angle));
    // Sphere vs needles: at offset (dy, dt) the bauble reaches sqrt(1-dy²-dt²)·R inward; it rests on the outermost contact.
    let radial = 0;
    for (const [dy, dt] of DISK) radial = Math.max(radial, sr(y + dy * R, angle + dt * da) + 0.98 * R * Math.sqrt(1 - dy * dy - dt * dt));
    const hook = Math.max(sr(y + 1.4 * R, angle), sr(y + 1.95 * R, angle));
    radial = Math.max(radial, hook + 0.12 * R);
    // Lean the hanger back onto the bough above when the surface recedes, so the ribbon touches the needles.
    const lean = Math.min(0.36, Math.max(0, Math.atan2(radial - hook - 0.12 * R, 1.95 * R)));
    out.push({ pos: [Math.sin(angle) * radial, y, Math.cos(angle) * radial], theta: angle, lean, R });
  }
  if (cache.size > 12) cache.delete(cache.keys().next().value!);
  cache.set(key, out);
  return out;
}

/** Bauble centre for an ornament; `index` is its creation order on the shared tree (hash of the id as fallback). */
export function ornamentAnchor(o: TreeOrnament, height: number, index = -1, count = Math.max(1, index + 1)): [number, number, number] {
  let slot = index;
  if (slot < 0) {
    let hash = 2166136261;
    for (const c of String(o.id)) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
    slot = (hash >>> 0) % Math.max(1, count);
  }
  const n = Math.max(count, slot + 1);
  return treeLayout(n, height)[slot]!.pos;
}
