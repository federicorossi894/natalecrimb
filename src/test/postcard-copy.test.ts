vi.mock('@/lib/campaign', async (original) => { const actual = await original<typeof import('@/lib/campaign')>(); return { ...actual, CAMPAIGN: actual.campaignCapabilities('DEMO') }; });
import { describe, expect, it, vi } from 'vitest';
import { PROJECTS } from '@/lib/data';
import { postcardCaption, postcardGiftIntro, postcardText } from '@/lib/postcard-share';

const project=PROJECTS[0]!;
const id='00000000-0000-4000-8000-000000000101';

describe('WhatsApp sharing copy',()=>{
  it('attaches a concise caption, not the handwritten message already visible in the PNG',()=>{
    const caption=postcardCaption(project,'Pino',id);
    expect(caption).toContain('per Pino');
    expect(caption).toContain('natale.crimonza.org/albero?addobbo='+id);
    expect(caption).toContain('DEMO');
    expect(caption).not.toContain('Ciao mail buon Natale');
    expect(caption.length).toBeLessThan(250);
  });
  it('keeps the personalised message in the text-only fallback',()=>{
    const body=postcardText(project,'Pino','Federico','Ciao mail buon Natale',id);
    expect(body).toContain('Ciao mail buon Natale');
    expect(body).toContain('— Federico');
    expect(body).toContain('natale.crimonza.org/albero?addobbo='+id);
    expect(body).toContain('DEMO');
  });
  it('handles no recipient and no ornament without inventing names',()=>{
    const caption=postcardCaption(project,'');
    expect(caption).toContain('per te');
    expect(caption).toContain('natale.crimonza.org/regali/');
  });
});

describe('private postcard attribution',()=>{
  it('uses the two names only on the personal greeting, before the dedication',()=>{
    expect(postcardGiftIntro('Chicco','Emma')).toBe('Chicco ha fatto un regalo a Emma');
    expect(postcardGiftIntro('Chicco','Emma',true)).toBe('');
  });
  it('gracefully handles optional names without inventing people',()=>{
    expect(postcardGiftIntro('','Emma')).toBe('Un regalo per Emma');
    expect(postcardGiftIntro('Chicco','')).toBe('Chicco ha fatto un regalo solidale');
    expect(postcardGiftIntro('','')).toBe('Un regalo pensato per te');
  });
  it('keeps the social caption short instead of exposing the donor name',()=>{
    expect(postcardCaption(project,'Emma',id)).not.toContain('Chicco');
    expect(postcardCaption(project,'Emma',id)).toContain('natale.crimonza.org');
  });
});
