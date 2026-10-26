import { describe, expect, it } from 'vitest';
import { demoGrowthOrnaments, GROWTH_PRESETS } from '@/lib/tree-growth-demo';

describe('growth preview demo ornaments', () => {
  it('offers the presets 10, 33, 50, 100, 200', () => {
    expect([...GROWTH_PRESETS]).toEqual([10, 33, 50, 100, 200]);
  });
  it('builds exactly the requested number of fictitious ornaments, capped at 200', () => {
    for (const n of GROWTH_PRESETS) expect(demoGrowthOrnaments(n)).toHaveLength(n);
    expect(demoGrowthOrnaments(500)).toHaveLength(200);
  });
  it('keeps the first ornaments identical when the count grows, with unique demo ids', () => {
    const a = demoGrowthOrnaments(33), b = demoGrowthOrnaments(200);
    expect(b.slice(0, 33)).toEqual(a);
    expect(new Set(b.map((o) => o.id)).size).toBe(200);
    expect(b.every((o) => String(o.id).startsWith('demo-crescita-'))).toBe(true);
  });
});
