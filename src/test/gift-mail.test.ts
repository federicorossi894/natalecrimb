import { describe, expect, it } from 'vitest';
import { giftMailInput } from '@/lib/gift-mail-policy';
import { giftMailParts, giftMailRaw, GIFT_MAIL_SENDER } from '@/lib/gift-mail.server';
import { PROJECTS } from '@/lib/data';
import { GIFT_IMPACT } from '@/lib/gift-impact';
const base={ornamentId:'00000000-0000-4000-8000-000000000001',giftRequestId:'00000000-0000-4000-8000-000000000002',client:'00000000-0000-4000-8000-000000000003',kind:'gift_now' as const,to:'Anna@Example.it',from:'Luca',toName:'Anna',msg:'Buone feste'};
const decode=(raw:string)=>{const t=atob(raw.replace(/-/g,'+').replace(/_/g,'/'));const [head,body]=t.split('\r\n\r\n');return {head:head??'',html:new TextDecoder().decode(Uint8Array.from(atob(body??''),c=>c.charCodeAt(0)))};};
describe('online gift email',()=>{
  it.each(PROJECTS)('explains the concrete Monza impact for $id in gifts and confirmations',project=>{
    for(const kind of ['receipt','gift_now','gift_christmas'] as const){
      const parts=giftMailParts({...giftMailInput.parse({...base,kind}),projectKind:project.ornament,projectTitle:project.title,amount:5});
      expect(parts.lines).toContain(GIFT_IMPACT[project.ornament]);
    }
  });
  it('accepts any valid recipient, normalised',()=>{expect(giftMailInput.parse(base).to).toBe('anna@example.it');});
  it('rejects header injection, links and addresses in visitor text',()=>{
    for(const bad of [{to:'a@b.it\r\nBcc: x@y.it'},{to:'a@b.it, c@d.it'},{msg:'vai su www.truffa.com'},{msg:'scrivi a x@y.it'},{from:'https://x'},{msg:'<script>'},{msg:'x'.repeat(91)}])expect(giftMailInput.safeParse({...base,...bad}).success).toBe(false);
  });
  it('rejects unknown kinds and extra fields',()=>{expect(giftMailInput.safeParse({...base,kind:'promo'}).success).toBe(false);expect(giftMailInput.safeParse({...base,bcc:'x@y.it'}).success).toBe(false);});
  it('sends from the configured sender to the recipient, without demo labels',()=>{
    const {head,html}=decode(giftMailRaw({...giftMailInput.parse(base),projectTitle:'Regala calore',amount:20},'ref'));
    expect(head).toContain(`<${GIFT_MAIL_SENDER}>`);expect(head).toContain('To: <anna@example.it>');expect(html).not.toMatch(/DEMO|SIMULAZ/i);
    expect(html).toContain('Buone feste');expect(html).toContain('addobbo=00000000-0000-4000-8000-000000000001');
  });
  it('christmas email says Buon Natale; receipt states amount and is not a tax receipt',()=>{
    expect(giftMailParts({...giftMailInput.parse({...base,kind:'gift_christmas'}),projectTitle:'P',amount:5}).subject).toMatch(/^Buon Natale, Anna/);
    const r=giftMailParts({...giftMailInput.parse({...base,kind:'receipt'}),projectTitle:'P',amount:20});
    expect(r.lines.join(' ')).toMatch(/20,00/);expect(r.lines.join(' ')).toMatch(/non costituisce ricevuta fiscale/);
  });
  it.each(['gift_now','gift_christmas'] as const)('recipient %s links to a new gift while retaining its own bauble link',kind=>{
    const content={...giftMailInput.parse({...base,kind}),projectTitle:'Regala calore',amount:5};
    expect(giftMailParts(content).invitation?.url).toBe('https://natale.crimonza.org/regali');
    const {html}=decode(giftMailRaw(content,'ref'));
    expect(html).toContain('href="https://natale.crimonza.org/regali"');
    expect(html).toContain(`href="https://natale.crimonza.org/albero?addobbo=${base.ornamentId}"`);
  });
  it('preserves the sender name exactly and includes a hidden preheader',()=>{
    const content={...giftMailInput.parse({...base,from:'TEST AUDIT'}),projectTitle:'Regala calore',amount:5};
    const parts=giftMailParts(content);
    expect(parts.subject).toContain('TEST AUDIT');
    const {html}=decode(giftMailRaw(content,'ref'));
    expect(html).toContain('TEST AUDIT ha scelto');
    expect(html).not.toContain('tEST AUDIT');
    expect(html).toContain('mso-hide:all');
  });
  it('includes authoritative gift date and a reference when provided',()=>{
    const content={...giftMailInput.parse({...base,kind:'receipt'}),projectTitle:'Regala calore',amount:5,createdAt:'2026-11-11T10:20:00Z'};
    const parts=giftMailParts(content);
    expect(parts.lines.join(' ')).toContain('11 nov 2026');
    expect(parts.lines.join(' ')).toContain(base.ornamentId);
  });
  it('donor confirmation does not include a recipient re-gifting action',()=>{
    const content={...giftMailInput.parse({...base,kind:'receipt'}),projectTitle:'Regala calore',amount:5};
    expect(giftMailParts(content).invitation).toBeNull();
    expect(decode(giftMailRaw(content,'ref')).html).not.toContain('href="https://natale.crimonza.org/regali"');
  });
});
