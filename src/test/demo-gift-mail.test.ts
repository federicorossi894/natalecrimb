// @vitest-environment node
import { it,expect } from 'vitest';
import { demoGiftMailInput,giftMailClaimId } from '@/lib/demo-gift-mail-policy';
import { qaRawMessage } from '@/lib/demo-email-qa.server';
const id='00000000-0000-4000-8000-000000000001';
const input={ornamentId:id,giftRequestId:id,client:id,kind:'gift_now',recipient:'federico.rossi@crimonza.org',approved:true,donor:'Federico',toName:'Giulia',msg:'Un abbraccio'};
const gift={projectTitle:'Regala prossimità',amount:20,ornamentId:id,donor:'Federico',toName:'Giulia',msg:'<script>private</script>'};
function decode(kind:'receipt'|'gift_now'|'christmas_simulation'){
  const raw=Buffer.from(qaRawMessage(kind,id,gift),'base64url').toString();
  return {raw,html:Buffer.from(raw.split('\r\n\r\n')[1]??'','base64').toString()};
}
it('accepts only exact QA recipient and explicit optin',()=>{expect(demoGiftMailInput.safeParse(input).success).toBe(true);expect(demoGiftMailInput.safeParse({...input,approved:false}).success).toBe(false);});
it.each(['foreign@example.org','federico.rossi894@gmail.com','Federico.Rossi@crimonza.org'])('rejects %s recipient',recipient=>expect(demoGiftMailInput.safeParse({...input,recipient}).success).toBe(false));
it('rejects unbounded/private payload or forged payment success input',()=>{expect(demoGiftMailInput.safeParse({...input,msg:'x'.repeat(91)}).success).toBe(false);expect(demoGiftMailInput.safeParse({...input,paymentCompleted:true}).success).toBe(false);});
it('claims are stable across reload but distinct per bauble and purpose',async()=>{const a=await giftMailClaimId(id,'receipt');expect(a).toBe(await giftMailClaimId(id,'receipt'));expect(a).not.toBe(await giftMailClaimId(id,'gift_now'));expect(a).not.toBe(await giftMailClaimId('00000000-0000-4000-8000-000000000002','receipt'));});
it('gift MIME has exact From/To, escaped actual project/names/message and bauble link',()=>{const {raw,html}=decode('gift_now');expect(raw).toContain('From: federico.rossi@crimonza.org');expect(raw).toContain('To: federico.rossi@crimonza.org');expect(html).toContain('Regala prossimità');expect(html).toContain('Per Giulia');expect(html).toContain('Da Federico');expect(html).toContain('&lt;script&gt;private&lt;/script&gt;');expect(html).not.toContain('<script>');expect(html).toContain(`addobbo=${id}`);});
it('receipt uses authoritative amount and clear simulated nonfiscal caveat',()=>{const {html}=decode('receipt');expect(html).toContain('20.00 €');expect(html).toContain('NON VALIDA COME RICEVUTA');expect(html).toContain('[DEMO — NESSUN PAGAMENTO]');});
it('Christmas sends now with simulation marker, not a scheduler claim',()=>{const {html}=decode('christmas_simulation');expect(html).toContain("simulazione dell&#39;invio programmato");expect(html).toContain('inviata SUBITO');expect(html).toContain('25/12');expect(html).toContain('Nessuna email programmata');});