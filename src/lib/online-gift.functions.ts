import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { assertCampaignPayment } from './campaign';
import { ONLINE_GIFT } from './site-experience';
import { amountSchema } from './cash';
import { PROJECTS } from './data';
import { GIFT_IMPACT } from './gift-impact';
const safe = (max: number) => z.string().trim().max(max).refine(v => !/[<>\u0000-\u001f]/u.test(v), 'Caratteri non ammessi');
export const onlineGiftInput = z.object({
  requestId: z.string().uuid(), client: z.string().uuid(), kind: z.enum(['calore','dae','prossimita','cuore']), amount: amountSchema, provider: z.enum(['sumup','paypal']),
  dedica: safe(90).default(''), firma: safe(40).default(''), consent: z.boolean().default(false),
}).strict();
/** Shared ornament, durable one-shot request; consented public dedication is published on the shared tree. */
export const createOnlineGift = createServerFn({ method: 'POST' }).inputValidator(d => onlineGiftInput.parse(d)).handler(async ({data}) => {
  if (!ONLINE_GIFT) throw new Error('Percorso non disponibile.');
  assertCampaignPayment(data.provider, 'demo');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const {data: rows,error} = await supabaseAdmin.rpc('hang_online_gift', {_request:data.requestId,_client:data.client,_kind:data.kind,_amount:data.amount*100,_firma:data.consent?data.firma:'',_dedica:data.consent?data.dedica:'',_consent:data.consent});
  const row=rows?.[0];
  if(error){ console.error('hang_online_gift',error.message); throw new Error(/Troppi|affollato|Firma|Dedica/.test(error.message)?error.message:'Pagamento non completato. Riprova: la stessa richiesta non crea doppioni.'); }
  if(!row) throw new Error('Pagamento non completato. Riprova.');
  const project = PROJECTS.find(p => p.ornament === data.kind);
  if (!project) throw new Error('Progetto non disponibile.');
  const { data: saved } = await supabaseAdmin.from('demo_ornaments').select('thank_you').eq('id', row.id).maybeSingle();
  let thankYou = saved?.thank_you ?? '';
  if (!thankYou) {
    const { data: claimed } = await supabaseAdmin.rpc('claim_online_gift_thanks', { _ornament: row.id });
    if (claimed) {
      const { generateGiftThanks, logThankYouFailure } = await import('./gift-thanks.server');
      try { thankYou = await generateGiftThanks(project, data.amount); }
      catch (error) { logThankYouFailure(error); }
      thankYou ||= `Grazie per il tuo gesto per Monza. ${GIFT_IMPACT[data.kind]}`;
      await supabaseAdmin.from('demo_ornaments').update({ thank_you: thankYou }).eq('id', row.id);
    }
  }
  return { ...row, thankYou: thankYou || `Grazie per il tuo gesto per Monza. ${project.tagline}` };
});
