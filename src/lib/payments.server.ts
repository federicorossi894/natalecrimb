import { z } from 'zod';
import { CAMPAIGN, assertCampaignPayment, type OnlineProvider } from './campaign';
import { decimalCents, validatePaymentEvidence, type PaymentEvidence } from './payment-policy';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const SUMUP = 'https://connector-gateway.lovable.dev/udc_sumup';
const PAYPAL = 'https://api-m.paypal.com';
const ORIGIN = 'https://natalecrimb.lovable.app';
type Donation = { id: string; provider: string; provider_id: string | null; amount_cents: number; access_hash: string; status: string; checkout_url: string | null };
export async function tokenHash(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
async function providerJson(response: Response) {
  if (!response.ok) {
    // Provider bodies may echo identifiers or credentials: never log secrets or expose them to visitors.
    console.error('Payment provider request failed', response.status);
    throw new Error(`Servizio di pagamento non disponibile (${response.status}). Nessuna conferma registrata.`);
  }
  return response.json() as Promise<unknown>;
}
async function sumup(path: string, method = 'GET', body?: object) {
  const key = process.env['UDC_SUMUP_API_KEY'];
  const gatewayKey = process.env['LOVABLE_API_KEY'];
  if (!key || !gatewayKey) throw new Error('Collegamento SumUp non disponibile.');
  return providerJson(await fetch(`${SUMUP}${path}`, { method, headers: { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': key, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }));
}
async function paypalToken() {
  const id = process.env['PAYPAL_CLIENT_ID'];
  const secret = process.env['PAYPAL_CLIENT_SECRET'];
  if (!id || !secret) throw new Error('Collegamento PayPal non disponibile.');
  const result = await providerJson(await fetch(`${PAYPAL}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' }));
  return z.object({ access_token: z.string().min(1) }).parse(result).access_token;
}
async function paypal(path: string, method = 'GET', body?: object, requestId?: string) {
  const token = await paypalToken();
  return providerJson(await fetch(`${PAYPAL}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(requestId ? { 'PayPal-Request-Id': requestId } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
}
const sumupCheckout = z.object({ id: z.string(), status: z.string(), checkout_reference: z.string(), amount: z.union([z.string(), z.number()]), currency: z.string(), transaction_id: z.string().optional(), transactions: z.array(z.object({ id: z.string(), status: z.string() })).optional() });
const paypalOrder = z.object({ id: z.string(), status: z.string(), purchase_units: z.array(z.object({ custom_id: z.string().optional(), amount: z.object({ currency_code: z.string(), value: z.string() }).optional(), payments: z.object({ captures: z.array(z.object({ id: z.string(), status: z.string(), amount: z.object({ currency_code: z.string(), value: z.string() }) })) }).optional() })) });

export async function createProviderCheckout(provider: OnlineProvider, id: string, amountCents: number) {
  assertCampaignPayment(provider, 'live');
  const returnUrl = `${ORIGIN}/pagamento?id=${id}`;
  if (provider === 'sumup') {
    const account = z.object({ merchant_profile: z.object({ merchant_code: z.string().min(1) }) }).parse(await sumup('/v0.1/me'));
    const checkout = z.object({ id: z.string(), hosted_checkout_url: z.string().url() }).parse(await sumup('/v0.1/checkouts', 'POST', {
      amount: amountCents / 100, currency: 'EUR', checkout_reference: id, merchant_code: account.merchant_profile.merchant_code,
      description: 'Donazione — Croce Rossa Italiana, Comitato di Monza', hosted_checkout: { enabled: true }, redirect_url: returnUrl, return_url: `${ORIGIN}/api/public/sumup-webhook`,
    }));
    assertProviderRedirect(checkout.hosted_checkout_url, provider);
    return { providerId: checkout.id, url: checkout.hosted_checkout_url };
  }
  const result = z.object({ id: z.string(), links: z.array(z.object({ rel: z.string(), href: z.string().url() })) }).parse(await paypal('/v2/checkout/orders', 'POST', {
    intent: 'CAPTURE', purchase_units: [{ custom_id: id, amount: { currency_code: 'EUR', value: (amountCents / 100).toFixed(2) }, description: 'Donazione — CRI Comitato di Monza' }],
    payment_source: { paypal: { experience_context: { user_action: 'PAY_NOW', return_url: returnUrl, cancel_url: `${returnUrl}&annullato=1` } } },
  }, id));
  const url = result.links.find(link => link.rel === 'payer-action' || link.rel === 'approve')?.href;
  if (!url) throw new Error('Link PayPal non disponibile.');
  assertProviderRedirect(url, provider);
  return { providerId: result.id, url };
}
function assertProviderRedirect(url: string, provider: OnlineProvider) {
  const target = new URL(url);
  const allowed = provider === 'sumup' ? ['sumup.com', 'sumup.me'] : ['paypal.com'];
  if (target.protocol !== 'https:' || !allowed.some(host => target.hostname === host || target.hostname.endsWith(`.${host}`))) throw new Error('Destinazione provider non valida.');
}
export async function loadDonation(id: string, accessToken?: string): Promise<Donation> {
  const { data, error } = await supabaseAdmin.from('live_donations').select('id,provider,provider_id,amount_cents,access_hash,status,checkout_url').eq('id', id).single();
  if (error || !data || (accessToken !== undefined && await tokenHash(accessToken) !== data.access_hash)) throw new Error('Donazione non disponibile su questo dispositivo.');
  return data;
}
export async function reconcileDonation(d: Donation, capture = false) {
  assertCampaignPayment(d.provider, 'live');
  if (!d.provider_id) return { status: d.status, ornamentId: null };
  let proof: PaymentEvidence;
  if (d.provider === 'sumup') {
    const result = sumupCheckout.parse(await sumup(`/v0.1/checkouts/${encodeURIComponent(d.provider_id)}`));
    if (result.status !== 'PAID') return { status: result.status === 'FAILED' ? 'failed' : 'pending', ornamentId: null };
    const paymentId = result.transaction_id ?? result.transactions?.find(t => t.status === 'SUCCESSFUL')?.id ?? result.id;
    proof = { provider: 'sumup', providerId: result.id, reference: result.checkout_reference, amountCents: decimalCents(result.amount), currency: result.currency, paymentId, paid: true };
  } else {
    let result = paypalOrder.parse(await paypal(`/v2/checkout/orders/${encodeURIComponent(d.provider_id)}`));
    if (capture && result.status === 'APPROVED') {
      // Re-check the trusted amount/reference BEFORE capture, not just after it.
      const unit = result.purchase_units[0];
      if (result.id !== d.provider_id || result.purchase_units.length !== 1 || unit?.custom_id !== d.id || unit.amount?.currency_code !== 'EUR' || decimalCents(unit.amount.value) !== d.amount_cents) throw new Error('Ordine PayPal non corrispondente.');
      result = paypalOrder.parse(await paypal(`/v2/checkout/orders/${encodeURIComponent(d.provider_id)}/capture`, 'POST', {}, `capture-${d.id}`));
    }
    const unit = result.purchase_units[0];
    const paidCapture = unit?.payments?.captures?.[0];
    if (result.status !== 'COMPLETED' || paidCapture?.status !== 'COMPLETED') return { status: 'pending', ornamentId: null };
    if (result.purchase_units.length !== 1 || unit?.payments?.captures?.length !== 1) throw new Error('Ordine PayPal non corrispondente.');
    proof = { provider: 'paypal', providerId: result.id, reference: unit.custom_id ?? '', amountCents: decimalCents(paidCapture.amount.value), currency: paidCapture.amount.currency_code, paymentId: paidCapture.id, paid: true };
  }
  validatePaymentEvidence(d, proof);
  const { data: ornamentId, error } = await supabaseAdmin.rpc('confirm_live_donation', { _id: d.id, _provider: proof.provider, _provider_id: proof.providerId, _payment_id: proof.paymentId, _amount_cents: proof.amountCents, _currency: proof.currency });
  if (error || !ornamentId) throw new Error('Pagamento da riconciliare: riprova senza effettuare una nuova donazione.');
  return { status: 'paid', ornamentId };
}
export async function handleSumupWebhook(request: Request) {
  assertCampaignPayment('sumup', 'live');
  const payload = z.object({ event_type: z.string().max(100), id: z.string().min(1).max(100) }).parse(await limitedJson(request));
  if (payload.event_type !== 'CHECKOUT_STATUS_CHANGED') return;
  const { data } = await supabaseAdmin.from('live_donations').select('id').eq('provider', 'sumup').eq('provider_id', payload.id).maybeSingle();
  // Callback is an untrusted hint; only authoritative SumUp API evidence can authorize the atomic write.
  if (data) await reconcileDonation(await loadDonation(data.id));
}
export async function handlePaypalWebhook(request: Request) {
  assertCampaignPayment('paypal', 'live');
  const webhookId = process.env['PAYPAL_WEBHOOK_ID'];
  if (!webhookId) throw new Error('Webhook PayPal non configurato.');
  const rawEvent = await limitedJson(request);
  const event = z.object({ id: z.string().max(100), event_type: z.string().max(100), resource: z.object({ supplementary_data: z.object({ related_ids: z.object({ order_id: z.string().max(100) }) }).optional() }) }).parse(rawEvent);
  const header = (name: string) => z.string().min(1).max(2048).parse(request.headers.get(name));
  const result = z.object({ verification_status: z.string() }).parse(await paypal('/v1/notifications/verify-webhook-signature', 'POST', {
    auth_algo: header('paypal-auth-algo'), cert_url: header('paypal-cert-url'), transmission_id: header('paypal-transmission-id'), transmission_sig: header('paypal-transmission-sig'), transmission_time: header('paypal-transmission-time'), webhook_id: webhookId, webhook_event: rawEvent,
  }));
  if (result.verification_status !== 'SUCCESS') throw new Error('Notifica non verificata.');
  if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') return;
  const orderId = event.resource.supplementary_data?.related_ids.order_id;
  if (!orderId) throw new Error('Riferimento ordine mancante.');
  const { data } = await supabaseAdmin.from('live_donations').select('id').eq('provider', 'paypal').eq('provider_id', orderId).maybeSingle();
  if (data) await reconcileDonation(await loadDonation(data.id));
}
async function limitedJson(request: Request) {
  const body = await request.text();
  if (body.length > 65536) throw new Error('Notifica troppo grande.');
  return JSON.parse(body) as unknown;
}
export function liveTreeEnabled() { if (CAMPAIGN.demo || !CAMPAIGN.liveData) throw new Error('Albero LIVE non disponibile.'); }