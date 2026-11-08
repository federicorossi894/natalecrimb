import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAMPAIGN, campaignCapabilities, type ProviderReadiness } from '@/lib/campaign';
import { donationCheckoutSchema, validatePaymentEvidence } from '@/lib/payment-policy';
import { createProviderCheckout, handlePaypalWebhook, reconcileDonation } from '@/lib/payments.server';

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: db }));
vi.mock('@/lib/campaign', async original => { const actual = await original<typeof import('@/lib/campaign')>(); return { ...actual, CAMPAIGN: { ...actual.CAMPAIGN } }; });
const providers: ProviderReadiness = { sumup: { implemented: true, configured: true, webhookVerified: true }, paypal: { implemented: true, configured: true, webhookVerified: true } };
const ready = { payments: true, liveData: true, cash: false, purchaseWishQR: false };
const id = '00000000-0000-4000-8000-000000000001';
const donation = { id, provider: 'sumup', provider_id: 'checkout-1', amount_cents: 500, access_hash: '', status: 'pending', checkout_url: null };
const fetchMock = vi.fn();
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock); vi.clearAllMocks();
  // Dummy test-only values, never contact providers or read real credentials.
  vi.stubEnv('UDC_SUMUP_API_KEY', 'test-only'); vi.stubEnv('LOVABLE_API_KEY', 'test-only'); vi.stubEnv('PAYPAL_CLIENT_ID', 'test-only'); vi.stubEnv('PAYPAL_CLIENT_SECRET', 'test-only');
  Object.assign(CAMPAIGN, campaignCapabilities('BASIC', ready, undefined, undefined, providers));
  db.rpc.mockResolvedValue({ data: 'ornament-1', error: null });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); Object.assign(CAMPAIGN, campaignCapabilities('DEMO')); });
describe('Real payment adapters, no external requests', () => {
  it.each(['BASIC','ADVANCED_1','ADVANCED_2'] as const)('%s creates hosted SumUp checkout from a trusted amount/reference', async mode => {
    Object.assign(CAMPAIGN, campaignCapabilities(mode, ready, undefined, undefined, providers));
    fetchMock.mockResolvedValueOnce(response({ merchant_profile: { merchant_code: 'test-merchant' } })).mockResolvedValueOnce(response({ id: 'checkout-1', hosted_checkout_url: 'https://checkout.sumup.com/test' }));
    const checkout = await createProviderCheckout('sumup', id, 500);
    expect(checkout.providerId).toBe('checkout-1');
    const init = fetchMock.mock.calls[1]?.[1];
    expect(JSON.parse(init.body)).toMatchObject({ amount: 5, currency: 'EUR', checkout_reference: id });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://connector-gateway.lovable.dev/udc_sumup/v0.1/checkouts');
  });
  it('DEMO never calls a real provider or writes LIVE data', async () => {
    Object.assign(CAMPAIGN, campaignCapabilities('DEMO', ready, undefined, undefined, providers));
    await expect(createProviderCheckout('sumup', id, 500)).rejects.toThrow();
    await expect(reconcileDonation(donation)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled();
  });
  it('a paid SumUp response calls the atomic confirmation and duplicate verification returns the same ornament', async () => {
    fetchMock.mockImplementation(async () => response({ id: 'checkout-1', status: 'PAID', checkout_reference: id, amount: 5, currency: 'EUR', transaction_id: 'transaction-1' }));
    expect(await reconcileDonation(donation)).toEqual({ status: 'paid', ornamentId: 'ornament-1' });
    expect(await reconcileDonation(donation)).toEqual({ status: 'paid', ornamentId: 'ornament-1' });
    expect(db.rpc).toHaveBeenCalledWith('confirm_live_donation', expect.objectContaining({ _amount_cents: 500, _currency: 'EUR', _payment_id: 'transaction-1' }));
  });
  it.each(['PENDING','FAILED'])('%s never creates an ornament', async status => {
    fetchMock.mockResolvedValue(response({ id: 'checkout-1', status, checkout_reference: id, amount: 5, currency: 'EUR' }));
    expect((await reconcileDonation(donation)).ornamentId).toBeNull(); expect(db.rpc).not.toHaveBeenCalled();
  });
  it.each([{ amount: 6 }, { currency: 'USD' }, { checkout_reference: 'other' }, { id: 'other' }])('rejects mismatched provider evidence %j', async override => {
    fetchMock.mockResolvedValue(response({ id: 'checkout-1', status: 'PAID', checkout_reference: id, amount: 5, currency: 'EUR', ...override }));
    await expect(reconcileDonation(donation)).rejects.toThrow(); expect(db.rpc).not.toHaveBeenCalled();
  });
  it('provider errors do not confirm donations', async () => {
    fetchMock.mockResolvedValue(response({ message: 'unavailable' }, 503));
    await expect(reconcileDonation(donation)).rejects.toThrow('503'); expect(db.rpc).not.toHaveBeenCalled();
  });
  it('PayPal captures an approved matching order server-side with an idempotency key', async () => {
    const order = { id: 'order-1', status: 'APPROVED', purchase_units: [{ custom_id: id, amount: { currency_code: 'EUR', value: '5.00' } }] };
    fetchMock.mockResolvedValueOnce(response({ access_token: 'test-token' })).mockResolvedValueOnce(response(order)).mockResolvedValueOnce(response({ access_token: 'test-token' })).mockResolvedValueOnce(response({ ...order, status: 'COMPLETED', purchase_units: [{ custom_id: id, payments: { captures: [{ id: 'capture-1', status: 'COMPLETED', amount: { currency_code: 'EUR', value: '5.00' } }] } }] }));
    expect(await reconcileDonation({ ...donation, provider: 'paypal', provider_id: 'order-1' }, true)).toEqual({ status: 'paid', ornamentId: 'ornament-1' });
    expect(fetchMock.mock.calls[3]?.[1].headers['PayPal-Request-Id']).toBe(`capture-${id}`);
  });
  it('PayPal amount mismatch is rejected BEFORE capture', async () => {
    fetchMock.mockResolvedValueOnce(response({ access_token: 'test-token' })).mockResolvedValueOnce(response({ id: 'order-1', status: 'APPROVED', purchase_units: [{ custom_id: id, amount: { currency_code: 'EUR', value: '4.00' } }] }));
    await expect(reconcileDonation({ ...donation, provider: 'paypal', provider_id: 'order-1' }, true)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2); expect(db.rpc).not.toHaveBeenCalled();
  });
  it('PayPal rejects invalid webhook signatures and sends the complete original event for verification', async () => {
    vi.stubEnv('PAYPAL_WEBHOOK_ID', 'test-webhook');
    const event = { id: 'event-1', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'capture-1', amount: { value: '5.00', currency_code: 'EUR' }, supplementary_data: { related_ids: { order_id: 'order-1' } } } };
    fetchMock.mockResolvedValueOnce(response({ access_token: 'test-token' })).mockResolvedValueOnce(response({ verification_status: 'FAILURE' }));
    const headers = Object.fromEntries(['auth-algo','cert-url','transmission-id','transmission-sig','transmission-time'].map(name => [`paypal-${name}`, 'test-only']));
    await expect(handlePaypalWebhook(new Request('https://example.test/webhook', { method: 'POST', headers, body: JSON.stringify(event) }))).rejects.toThrow();
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1].body).webhook_event).toEqual(event);
    expect(db.from).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled();
  });
  it('requires at least 5 whole euros before checkout', () => {
    const input = { provider: 'sumup', kind: 'calore', amount: 5, accessToken: 'a'.repeat(64), requestId: id };
    expect(donationCheckoutSchema.safeParse(input).success).toBe(true);
    for (const amount of [0,4,4.99,5.01,1001]) expect(donationCheckoutSchema.safeParse({ ...input, amount }).success).toBe(false);
  });
  it('does not accept a browser success marker as payment evidence', () => {
    expect(() => validatePaymentEvidence(donation, { provider: 'sumup', providerId: 'checkout-1', paymentId: '', reference: id, amountCents: 500, currency: 'EUR', paid: true })).toThrow();
  });
});