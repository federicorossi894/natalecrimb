import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { assertGiftEmailService, type GiftEmailOutcome } from './gift-email-policy';
import { donationAccessSchema } from './payment-policy';
import { giftDeliverySchema, giftDeliveryTime } from './donation-email-policy';
import { assertOfficialEmailReady, DEMO_EMAIL_QA } from './email-readiness';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { CAMPAIGN } from './campaign';

/** No recipient input or side effects until sender setup and verified paid-gift ownership exist. */
export const giftEmailAvailability = createServerFn({ method: 'POST' })
  .inputValidator((data) => z.object({ mode: z.enum(['now', 'christmas']) }).strict().parse(data))
  .handler(async ({ data }): Promise<GiftEmailOutcome> => {
    try { assertGiftEmailService(data.mode); }
    catch { return { state: 'unavailable', reason: 'sender_not_configured' }; }
    // Readiness flags alone must never turn a missing integration into success.
    return { state: 'unavailable', reason: 'live_service_not_implemented' };
  });

/** Feature-specific request: one owned paid donation, one expected recipient, one immutable gift. */
export const requestPaidGiftEmail = createServerFn({ method: 'POST' })
  .inputValidator(data => donationAccessSchema.extend({ gift: giftDeliverySchema }).strict().parse(data))
  .handler(async ({ data }) => {
    assertOfficialEmailReady();
    assertGiftEmailService(data.gift.mode);
    const { loadDonation } = await import('./payments.server');
    const d = await loadDonation(data.id, data.accessToken);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: record, error } = await supabaseAdmin.from('live_donations').select('status,settlement_state,gift_email_state').eq('id', d.id).single();
    if (error || record?.status !== 'paid' || record.settlement_state !== 'completed') throw new Error('Donazione non confermata.');
    const due = giftDeliveryTime(data.gift.mode, new Date());
    const result = await supabaseAdmin.from('live_donations').update({ gift_email_private: data.gift.to, gift_email_data: { donor: data.gift.donor, toName: data.gift.toName, msg: data.gift.msg }, gift_email_due_at: due, gift_email_state: 'blocked' }).eq('id', d.id).eq('gift_email_state', 'not_requested').select('id');
    if (result.error) throw new Error('Richiesta regalo non salvata.');
    if (due) return { state: 'blocked' as const }; // Never say scheduled until a managed single-event schedule is registered.
    const { processDonationEmail } = await import('./donation-email.server');
    return processDonationEmail(d.id, 'gift');
  });

/** Private opt-out on the donor's originating device. No address returned to the browser. */
export const cancelDonationEmail = createServerFn({ method: 'POST' })
  .inputValidator(data => donationAccessSchema.extend({ kind: z.enum(['receipt', 'gift']) }).strict().parse(data))
  .handler(async ({ data }) => {
    if (CAMPAIGN.demo) return { state: 'cancelled' as const };
    const { loadDonation } = await import('./payments.server');
    await loadDonation(data.id, data.accessToken);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const field = data.kind === 'receipt' ? 'donor_email_state' : 'gift_email_state';
    const update = data.kind === 'receipt' ? { donor_email_requested: false, donor_email_private: null, donor_email_state: 'cancelled' } : { gift_email_private: null, gift_email_data: null, gift_email_state: 'cancelled' };
    const result = await supabaseAdmin.from('live_donations').update(update).eq('id', data.id).in(field, ['not_requested', 'blocked', 'failed']).select('id');
    if (result.error || !result.data?.length) throw new Error('Invio già preso in carico: annullamento non garantito.');
    return { state: 'cancelled' as const };
  });

export const retryDonationEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(data => z.object({ id: z.string().uuid(), kind: z.enum(['receipt', 'gift']) }).strict().parse(data))
  .handler(async ({ data, context }) => {
    const allowed = await context.supabase.rpc('is_moderator');
    if (allowed.error || !allowed.data) throw new Error('Operazione riservata.');
    assertOfficialEmailReady();
    const { processDonationEmail } = await import('./donation-email.server');
    return processDonationEmail(data.id, data.kind, true);
  });

/** Recipient is never accepted from the browser; allowlist remains empty pending owner's confirmation. */
export const testDemoEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(data => z.object({}).strict().parse(data))
  .handler(async ({ context }) => {
    const allowed = await context.supabase.rpc('is_moderator');
    if (allowed.error || !allowed.data) throw new Error('Prova riservata al personale autorizzato.');
    if (!CAMPAIGN.demo || !DEMO_EMAIL_QA.enabled || DEMO_EMAIL_QA.confirmedRecipients.length !== 1) return { state: 'unavailable' as const, reason: 'qa_recipient_not_confirmed' };
    assertOfficialEmailReady();
    // No real QA adapter before domain setup. No arbitrary public send endpoint exists.
    return { state: 'unavailable' as const, reason: 'managed_sender_not_configured' };
  });