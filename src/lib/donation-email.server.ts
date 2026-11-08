import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { CAMPAIGN } from './campaign';
import { officialEmailReady } from './email-readiness';
import { deliverDonationEmail, type DeliveryPorts } from './donation-email-delivery';
import type { DeliveryKind } from './donation-email-policy';
/** No sender domain exists. Do NOT replace with direct API calls or invent scaffold constants.
 * Domain setup + managed scaffold + operational verification are necessary before providing this adapter.
 */
const managedSendAdapter: DeliveryPorts['send'] | undefined = undefined;
export async function processDonationEmail(id: string, kind: DeliveryKind, retry = false) {
  const adapter = managedSendAdapter;
  if (CAMPAIGN.demo || !officialEmailReady() || !adapter) return { state: 'blocked' as const };
  const { data: d, error } = await supabaseAdmin.from('live_donations')
    .select('id,status,settlement_state,donor_email_requested,gift_email_private').eq('id', id).single();
  if (error || !d) return { state: 'blocked' as const };
  return deliverDonationEmail({ ...d, requested: kind === 'receipt' ? d.donor_email_requested : Boolean(d.gift_email_private) }, kind, {
    ready: true, demo: false, send: adapter,
    claim: async (donationId, purpose, authorizedRetry) => {
      const result = await supabaseAdmin.rpc('claim_donation_email', { _id: donationId, _kind: purpose, _retry: authorizedRetry });
      if (result.error) throw new Error('Conferma email da verificare.');
      return result.data;
    },
    finish: async (donationId, purpose, claim, state) => {
      const result = await supabaseAdmin.rpc('finish_donation_email', { _id: donationId, _kind: purpose, _claim: claim, _state: state });
      if (result.error || !result.data) throw new Error('Esito email da verificare.');
    },
  }, retry);
}