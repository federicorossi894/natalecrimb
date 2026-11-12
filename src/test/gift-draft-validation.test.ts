import { describe, expect, it } from 'vitest';
import { giftDraftIssue, PRIVATE_GIFT_MESSAGE_MAX } from '@/lib/gift-draft-validation';
const base = {gift:true,to:'Pino',from:'Federico',msg:'Buon Natale',publicFields:{dedica:'Per Monza',firma:'Federico',consent:true}};
describe('before-payment dedication validation',()=>{
  it('accepts exactly the same 90 characters as the server and private email template',()=>{
    expect(giftDraftIssue({...base,msg:'a'.repeat(PRIVATE_GIFT_MESSAGE_MAX)})).toBeNull();
    expect(giftDraftIssue({...base,msg:'a'.repeat(PRIVATE_GIFT_MESSAGE_MAX+1)})).toContain('massimo 90 caratteri');
  });
  it('returns a human-readable error instead of raw Zod internals for long text',()=>{
    const issue=giftDraftIssue({...base,msg:'x'.repeat(240)}) ?? '';
    expect(issue).toContain('dedica per la persona');
    expect(issue).not.toContain('too_big');
    expect(issue).not.toContain('path');
  });
  it('allows distinct public text but checks the shared tree limit before checkout',()=>{
    expect(giftDraftIssue({...base,msg:'Privato',publicFields:{dedica:'x'.repeat(91),firma:'F.',consent:true}})).toContain('albero');
    expect(giftDraftIssue({...base,msg:'Privato',publicFields:{dedica:'Testo pubblico',firma:'F.',consent:true}})).toBeNull();
  });
  it('never validates stale recipient text if the donor chooses Monza',()=>{
    expect(giftDraftIssue({...base,gift:false,msg:'x'.repeat(240),to:'x'.repeat(50),from:'x'.repeat(50)})).toBeNull();
  });
  it('blocks characters and links incompatible with the email integration',()=>{
    expect(giftDraftIssue({...base,msg:'Guarda https://example.org'})).toContain('link');
    expect(giftDraftIssue({...base,msg:'Ciao <script>'})).toContain('caratteri');
  });
});
