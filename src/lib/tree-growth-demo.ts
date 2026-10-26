import type { OrnamentKind, TreeOrnament } from './data';

/** Presets offered by the /tv-preview "Crescita albero" mode. */
export const GROWTH_PRESETS = [10, 33, 50, 100, 200] as const;
export const GROWTH_MAX = 200;

const KINDS: OrnamentKind[] = ['calore', 'dae', 'prossimita', 'cuore'];
const rnd = (i: number, s: number) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

/**
 * Temporary, fictitious ornaments for the internal growth preview. Built in memory only (never sent anywhere),
 * deterministic, and prefix-stable: the first N of 200 are always the same, so baubles keep their place as N grows.
 * x/y (%) are only used by the illustrated fallback; the 3D tree places baubles by creation order.
 */
export function demoGrowthOrnaments(count: number): TreeOrnament[] {
  const n = Math.max(0, Math.min(GROWTH_MAX, Math.round(count)));
  return Array.from({ length: n }, (_, i) => {
    const y = 22 + rnd(i, 1) * 60;
    const half = ((y - 10) / 80) * 34;
    return { id: `demo-crescita-${i + 1}`, kind: KINDS[Math.floor(rnd(i, 2) * KINDS.length)]!, x: 50 + (rnd(i, 3) * 2 - 1) * half * 0.85, y };
  });
}
