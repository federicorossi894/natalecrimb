import { describe, expect, it } from 'vitest';
import { PROJECTS } from '@/lib/data';
import { postcardCaption, postcardText } from '@/lib/postcard-share';

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
