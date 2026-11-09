import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { assertCampaignPayment } from './campaign';
import { ONLINE_GIFT } from './site-experience';
import { amountSchema } from './cash';
export const onlineGiftInput = z.object({ requestId: z.string().uuid(), client: z.string().uuid(), kind: z.enum(['calore','dae','prossimita','cuore']), amount: amountSchema, provider: z.enum(['sumup','paypal']) }).strict();
/** Shared DEMO ornament core, durable one-shot request; no private text/contact input. */
export const createOnlineGift = createServerFn({ method: 'POST' }).inputValidator(d => onlineGiftInput.parse(d)).handler(async ({data}) => {
  if (!ONLINE_GIFT) throw new Error('Percorso non disponibile.');
  assertCampaignPayment(data.provider, 'demo');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const {data: rows,error} = await supabaseAdmin.rpc('hang_online_gift', {_request:data.requestId,_client:data.client,_kind:data.kind,_amount:data.amount*100});
  const row=rows?.[0];
  if(error || !row) throw new Error('Simulazione non completata. Riprova: la stessa richiesta non crea doppioni.');
  return row;
});