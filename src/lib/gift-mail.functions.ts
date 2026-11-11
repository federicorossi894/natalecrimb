import { createServerFn } from '@tanstack/react-start';
import { ONLINE_GIFT } from './site-experience';
import { CAMPAIGN } from './campaign';
import { PROJECTS } from './data';
import { giftMailInput } from './gift-mail-policy';

/** Sends the confirmation or the gift email after a completed gift; one per bauble and purpose, with global caps. */
export const sendOnlineGiftMail = createServerFn({ method: 'POST' }).inputValidator(d => giftMailInput.parse(d)).handler(async ({ data }) => {
  // Historical DEMO requests must never become an unverified LIVE email channel.
  if (!ONLINE_GIFT || !CAMPAIGN.demo) throw new Error('Percorso DEMO non disponibile in LIVE.');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: row, error } = await supabaseAdmin.from('demo_ornaments').select('id,kind,amount_cents,created_at')
    .eq('id', data.ornamentId).eq('online_request_id', data.giftRequestId).eq('client_id', data.client).maybeSingle();
  if (error || !row) return { state: 'failed' as const, message: 'Regalo non trovato.' };
  if (Date.now() - new Date(row.created_at).getTime() > 6 * 3600_000) return { state: 'failed' as const, message: 'Il tempo per inviare l’email di questo regalo è scaduto.' };
  const project = PROJECTS.find(p => p.ornament === row.kind);
  if (!project || row.amount_cents === null) return { state: 'failed' as const, message: 'Progetto non disponibile.' };
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`gift-mail:${data.to}`))), b => b.toString(16).padStart(2, '0')).join('');
  const { data: claim, error: claimError } = await supabaseAdmin.rpc('claim_online_gift_mail', { _ornament: row.id, _kind: data.kind, _recipient_hash: hash });
  const c = claim?.[0];
  if (claimError || !c) { console.error('claim_online_gift_mail', claimError?.message); return { state: 'failed' as const, message: 'Invio non disponibile in questo momento.' }; }
  if (!c.id) return { state: 'limited' as const, message: c.reason === 'already_sent' ? 'Email già inviata per questo regalo.' : c.reason === 'recipient_limit' ? 'Questo indirizzo ha già ricevuto diverse email oggi.' : 'Troppi invii in questo momento, riprova tra qualche minuto.' };
  const { sendGiftMail } = await import('./gift-mail.server');
  let result: Awaited<ReturnType<typeof sendGiftMail>>;
  try { result = await sendGiftMail({ kind: data.kind, to: data.to, projectTitle: project.title, projectKind: project.ornament, amount: row.amount_cents / 100, ornamentId: row.id, from: data.from, toName: data.toName, msg: data.msg, createdAt: row.created_at }, c.id); }
  catch (e) { console.error('Gift mail', e); result = { state: 'unknown' }; }
  await supabaseAdmin.from('online_gift_mails').update({ state: result.state, message_id: result.messageId ?? null, finished_at: new Date().toISOString() }).eq('id', c.id);
  return result.state === 'accepted' ? { state: 'accepted' as const, message: `Email inviata a ${data.to}.` }
    : result.state === 'unknown' ? { state: 'unknown' as const, message: 'Non siamo sicuri che sia partita: controlla la posta prima di riprovare.' }
    : { state: 'failed' as const, message: 'L’email non è partita. Riprova più tardi.' };
});
