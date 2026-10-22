import type { TreeOrnament } from './data';

/** Grows from a complete small fir (few gifts) to a spectacular tree at 200 demo gifts. */
export function treeHeight(count: number) { return 1.8 + 2.8 * Math.sqrt(Math.min(200, Math.max(0, count)) / 200); }
/**
 * Stable anchor for an ornament. `index` is its creation order on the shared tree: golden-ratio
 * sampling spreads any number of gifts evenly over the cone surface (first gifts face the camera).
 * Without an index a hash of the id is used.
 */
export function ornamentAnchor(o: TreeOrnament, height: number, index = -1): [number, number, number] {
  let slot = index;
  if (slot < 0) {
    let hash = 2166136261;
    for (const c of String(o.id)) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
    slot = (hash >>> 0) % 997;
  }
  const u = (slot * 0.61803398875 + 0.35) % 1;
  // Uniform over the cone's lateral area between 16% and 80% of the height.
  const level = 1 - Math.sqrt(0.04 + u * (0.7056 - 0.04));
  const angle = slot * 2.39996323;
  const radius = height * 0.37 * (1 - level) + height * 0.025;
  return [Math.sin(angle) * radius, height * level, Math.cos(angle) * radius];
}
