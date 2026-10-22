import type { TreeOrnament } from './data';

/** Grows from a complete small fir (few gifts) to a spectacular tree at 200 demo gifts. */
export function treeHeight(count: number) { return 1.8 + 2.8 * Math.sqrt(Math.min(200, Math.max(0, count)) / 200); }
export function ornamentAnchor(o: TreeOrnament, height: number): [number, number, number] {
  let hash = 2166136261;
  for (const c of String(o.id)) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  const slot = (hash >>> 0) % 997;
  const level = 0.18 + ((slot * 0.61803398875) % 1) * 0.63;
  const angle = slot * 2.39996323;
  const radius = height * 0.37 * (1 - level) + height * 0.025;
  return [Math.sin(angle) * radius, height * level, Math.cos(angle) * radius];
}
