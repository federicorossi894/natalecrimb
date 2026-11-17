import { describe, expect, it } from 'vitest';
import { socialStoryText, storyLockupLayout } from '@/lib/social-share';
import { LOCKUP } from '@/lib/cri-lockup';
import source from '@/lib/social-share.ts?raw';

describe('public story share copy',()=>{
  it('invites to the official site and contains no personal details or donation amounts',()=>{
    const text=socialStoryText();
    expect(text).toContain('natale.crimonza.org');
    expect(text).toContain('dono solidale');
    expect(text).not.toContain('€');
    expect(text).not.toContain('destinatario');
  });
});

describe('story CRI Monza lockup',()=>{
  it('composes Comitato di Monza in red Arial under the wordmark, as one block',()=>{
    const l=storyLockupLayout();
    const g=LOCKUP.horizontal; const s=l.scale;
    expect(l.textX).toBeCloseTo(l.x+(g.wordCenterX-g.view[0])*s);
    const wordFont=(g.wordBaseline-g.wordCapTop)/0.716;
    expect(l.fontSize).toBeCloseTo(wordFont*0.8*s,0);
    expect(l.textBaseline).toBeLessThan(l.y+l.h);
    expect(l.separatorY).toBeGreaterThan(l.y+l.h);
    expect(l.separatorY).toBeLessThan(500);
  });
  it('no longer draws the separate green Manrope title',()=>{
    expect(source).not.toContain('COMITATO DI MONZA');
    expect(source).toContain('TERRITORIAL_LABEL');
  });
});
