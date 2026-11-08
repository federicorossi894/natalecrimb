import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAMPAIGN, campaignCapabilities, type ProviderReadiness } from '@/lib/campaign';
import { createProviderCheckout, handlePaypalWebhook, handleSumupWebhook, reconcileDonation, recoverLivePayments } from '@/lib/payments.server';

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: db }));
vi.mock('@/lib/campaign', async original => {
  const actual = await original<typeof import('@/lib/campaign')>();
  const campaign = { ...actual.CAMPAIGN };
  return { ...actual, CAMPAIGN: campaign,
    assertCampaignPayment: (m: string, e: 'demo' | 'live') => actual.assertCampaignPayment(m, e, campaign),
    assertCampaignAction: (a: Parameters<typeof actual.assertCampaignAction>[0]) => actual.assertCampaignAction(a, campaign) };
});
const id = '00000000-0000-4000-8000-000000000001';
const d = { id, provider: 'paypal', provider_id: 'order-1', amount_cents: 500, access_hash: '', status: 'pending', checkout_url: null };
const providers: ProviderReadiness = { sumup: { implemented: true, configured: true, webhookVerified: true }, paypal: { implemented: true, configured: true, webhookVerified: true } };
const ready = { payments: true, liveData: true, cash: false, purchaseWishQR: false };
const fetchMock = vi.fn();
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const order = (status = 'APPROVED', captureStatus?: string) => ({ id: 'order-1', status, purchase_units: [{ custom_id: id, amount: { currency_code: 'EUR', value: '5.00' }, ...(captureStatus ? { payments: { captures: [{ id: 'capture-1', status: captureStatus, amount: { currency_code: 'EUR', value: '5.00' } }] } } : {}) }] });
const webhook = (type = 'CHECKOUT.ORDER.APPROVED') => new Request('https://example.test/webhook', {
  method: 'POST', headers: Object.fromEntries(['auth-algo','cert-url','transmission-id','transmission-sig','transmission-time'].map(k => [`paypal-${k}`, 'test-only'])),
  body: JSON.stringify({ id: 'event-1', event_type: type, resource: { id: type === 'CHECKOUT.ORDER.APPROVED' ? 'order-1' : 'capture-1', supplementary_data: { related_ids: { order_id: 'order-1' } } } }),
});
let claimed: boolean;
let completed: boolean;
let confirmations: number;
let terminal: string;
let lookupError: boolean;
beforeEach(() => {
  vi.clearAllMocks(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock);
  for (const key of ['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_WEBHOOK_ID','UDC_SUMUP_API_KEY','LOVABLE_API_KEY']) vi.stubEnv(key, 'test-only');
  Object.assign(CAMPAIGN, campaignCapabilities('BASIC', ready, undefined, undefined, providers));
  claimed = false; completed = false; confirmations = 0; terminal = ''; lookupError = false;
  db.rpc.mockImplementation(async (name: string) => {
    if (name === 'claim_live_capture') { if (claimed) return { data: false }; claimed = true; return { data: true }; }
    if (name === 'confirm_live_donation') { confirmations++; return { data: 'ornament-1' }; }
    if (name === 'claim_live_recovery') return { data: [] };
    throw new Error('Unexpected RPC');
  });
  db.from.mockImplementation(() => {
    const q: Record<string, unknown> = {};
    for (const method of ['select','eq','is','update']) q[method] = vi.fn(() => q);
    q['maybeSingle'] = vi.fn(async () => ({ data: { id }, error: lookupError ? {} : null }));
    q['single'] = vi.fn(async () => ({ data: d }));
    q['then'] = (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve);
    return q;
  });
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith('/token')) return response({ access_token: 'test-token' });
    if (url.endsWith('verify-webhook-signature')) return response({ verification_status: 'SUCCESS' });
    if (url.endsWith('/capture')) { completed = true; return response(order('COMPLETED','COMPLETED')); }
    if (url.includes('/v2/payments/captures/')) return response({ id: 'capture-1', status: terminal || 'COMPLETED', amount: { currency_code: 'EUR', value: '5.00' }, supplementary_data: { related_ids: { order_id: 'order-1' } } });
    return response(order(completed || terminal ? 'COMPLETED' : 'APPROVED', terminal || (completed ? 'COMPLETED' : undefined)));
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); Object.assign(CAMPAIGN, campaignCapabilities('DEMO')); });
const captures = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/capture'));

describe('Mock-only pre-live hardening', () => {
  it.each(['BASIC','ADVANCED_1','ADVANCED_2'] as const)('%s captures verified APPROVED webhook without a browser', async mode => {
    Object.assign(CAMPAIGN, campaignCapabilities(mode, ready, undefined, undefined, providers));
    await handlePaypalWebhook(webhook());
    expect(captures()).toHaveLength(1); expect(confirmations).toBe(1);
    expect(captures()[0]?.[1].headers['PayPal-Request-Id']).toBe(`capture-${id}`);
  });
  it('repeated APPROVED callback never captures twice and confirms the same ornament', async () => {
    await handlePaypalWebhook(webhook()); await handlePaypalWebhook(webhook());
    expect(captures()).toHaveLength(1); expect(confirmations).toBe(2);
    expect(db.rpc.mock.calls.filter(([n]) => n === 'confirm_live_donation').map(([,v]) => v._id)).toEqual([id,id]);
  });
  it('concurrent webhooks and browser return emit only one capture', async () => {
    await Promise.all([handlePaypalWebhook(webhook()), handlePaypalWebhook(webhook()), reconcileDonation(d,true)]);
    expect(captures()).toHaveLength(1); expect(claimed).toBe(true); expect(confirmations).toBeGreaterThan(0);
  });
  it('invalid signature cannot load data or capture', async () => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith('/token') ? response({ access_token: 'test' }) : response({ verification_status: 'FAILURE' }));
    await expect(handlePaypalWebhook(webhook())).rejects.toThrow('Notifica non verificata');
    expect(db.from).not.toHaveBeenCalled(); expect(captures()).toHaveLength(0);
  });
  it('database lookup failure requests retry instead of acknowledging a lost callback', async () => {
    lookupError = true; await expect(handlePaypalWebhook(webhook())).rejects.toThrow('Registro'); expect(captures()).toHaveLength(0);
  });
  it('DB failure after successful capture recovers by GET without a second capture', async () => {
    const implementation = db.rpc.getMockImplementation();
    let fail = true;
    db.rpc.mockImplementation(async (...args) => {
      if (args[0] === 'confirm_live_donation' && fail) { fail = false; return { error: {} }; }
      return implementation?.(...args);
    });
    await expect(handlePaypalWebhook(webhook())).rejects.toThrow('riconciliare');
    await handlePaypalWebhook(webhook()); expect(captures()).toHaveLength(1); expect(confirmations).toBe(1);
  });
  it('ambiguous capture timeout permanently suppresses automatic recapture', async () => {
    const implementation = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (...args) => { if (String(args[0]).endsWith('/capture')) throw new Error('timeout'); return implementation?.(...args); });
    await expect(reconcileDonation(d,true)).rejects.toThrow('timeout');
    expect(await reconcileDonation(d,true)).toEqual({ status: 'pending', ornamentId: null });
    expect(captures()).toHaveLength(1); expect(confirmations).toBe(0);
  });
  it.each(['PENDING','DENIED','REVERSED'])('%s event uses server capture status and never confirms', async status => {
    terminal = status; await handlePaypalWebhook(webhook(`PAYMENT.CAPTURE.${status}`));
    expect(confirmations).toBe(0); expect(captures()).toHaveLength(0);
    if (status !== 'PENDING') expect(db.from).toHaveBeenCalledWith('live_donations');
  });
  it('COMPLETED notification cannot override server PENDING', async () => {
    terminal = 'PENDING'; await handlePaypalWebhook(webhook('PAYMENT.CAPTURE.COMPLETED')); expect(confirmations).toBe(0);
  });
  it('COMPLETED notification confirms only after independent capture and order reads', async () => {
    completed = true; await handlePaypalWebhook(webhook('PAYMENT.CAPTURE.COMPLETED'));
    expect(confirmations).toBe(1); expect(captures()).toHaveLength(0);
  });
  it.each(['PENDING','DENIED','FAILED'])('server order capture %s never creates an ornament', async status => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith('/token') ? response({ access_token: 'test' }) : response(order('COMPLETED',status)));
    expect((await reconcileDonation(d,true)).ornamentId).toBeNull(); expect(confirmations).toBe(0);
  });
  it.each([{ id: 'other' }, { purchase_units: [{ custom_id: 'other', amount: { currency_code: 'EUR', value: '5.00' } }] }, { purchase_units: [{ custom_id: id, amount: { currency_code: 'USD', value: '5.00' } }] }])('mismatching approved order fails before capture %j', async override => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith('/token') ? response({ access_token: 'test' }) : response({ ...order(), ...override }));
    await expect(reconcileDonation(d,true)).rejects.toThrow(); expect(captures()).toHaveLength(0); expect(claimed).toBe(false);
  });
  it.each(['PENDING','FAILED','PAID'])('spoofed SumUp callback obeys server status %s', async status => {
    db.from.mockImplementation(() => {
      const q = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: { id } })), single: vi.fn(async () => ({ data: { ...d, provider: 'sumup', provider_id: 'sumup-1' } })) };
      q.select.mockReturnValue(q); q.eq.mockReturnValue(q); return q;
    });
    fetchMock.mockResolvedValue(response({ id: 'sumup-1', status, checkout_reference: id, amount: 5, currency: 'EUR', transaction_id: 'tx-1' }));
    await handleSumupWebhook(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ event_type: 'CHECKOUT_STATUS_CHANGED', id: 'sumup-1', status: 'PAID' }) }));
    expect(confirmations).toBe(status === 'PAID' ? 1 : 0);
  });
  it('DEMO rejects every server payment path before network or data access', async () => {
    Object.assign(CAMPAIGN, campaignCapabilities('DEMO',ready,undefined,undefined,providers));
    for (const action of [() => createProviderCheckout('paypal',id,500), () => reconcileDonation(d,true), () => handlePaypalWebhook(webhook()), () => handleSumupWebhook(new Request('https://example.test')), () => recoverLivePayments()]) await expect(action()).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled(); expect(db.from).not.toHaveBeenCalled();
  });
  it.each(['BASIC','ADVANCED_1','ADVANCED_2'] as const)('%s remains closed with actual unverified readiness', async mode => {
    Object.assign(CAMPAIGN,campaignCapabilities(mode));
    await expect(handlePaypalWebhook(webhook())).rejects.toThrow(); await expect(recoverLivePayments()).rejects.toThrow(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('adapter rejects below 5 EUR even if the input form is bypassed', async () => {
    await expect(createProviderCheckout('paypal',id,400)).rejects.toThrow(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('recovery reconciles approved stored orders without browser', async () => {
    const implementation = db.rpc.getMockImplementation();
    db.rpc.mockImplementation(async (...args) => args[0] === 'claim_live_recovery' ? { data: [d] } : implementation?.(...args));
    expect(await recoverLivePayments()).toEqual({ checked: 1, paid: 1, manual: 0, errors: 0 }); expect(captures()).toHaveLength(1);
  });
  it('missing PayPal ID is flagged for manual lookup, never creates another order', async () => {
    db.rpc.mockResolvedValue({ data: [{ ...d, provider_id: null, status: 'creating' }] });
    expect(await recoverLivePayments()).toEqual({ checked: 1, paid: 0, manual: 1, errors: 0 }); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([0,2])('ambiguous SumUp reference with %s matches never recreates checkout', async count => {
    db.rpc.mockResolvedValue({ data: [{ ...d, provider: 'sumup', provider_id: null, status: 'creating' }] });
    fetchMock.mockResolvedValue(response(Array.from({ length: count }, () => ({ id: 'sumup-1', status: 'PENDING', checkout_reference: id, amount: 5, currency: 'EUR' }))));
    expect((await recoverLivePayments()).manual).toBe(1);
    expect(fetchMock.mock.calls.every(([,init]) => init.method === 'GET')).toBe(true);
  });
  it('unique SumUp reference restores an orphan checkout and confirms via trusted status', async () => {
    db.rpc.mockImplementation(async name => name === 'claim_live_recovery' ? { data: [{ ...d, provider: 'sumup', provider_id: null, status: 'creating' }] } : { data: 'ornament-1' });
    const found = { id: 'sumup-1', status: 'PAID', checkout_reference: id, amount: 5, currency: 'EUR', transaction_id: 'tx-1', hosted_checkout_url: 'https://checkout.sumup.com/test' };
    fetchMock.mockImplementation(async url => response(String(url).includes('?') ? [found] : found));
    expect(await recoverLivePayments()).toEqual({ checked: 1, paid: 1, manual: 0, errors: 0 });
    expect(fetchMock.mock.calls.every(([,init]) => init.method === 'GET')).toBe(true);
  });
  it('database capture claim failure prevents capture', async () => {
    db.rpc.mockResolvedValue({ error: {} });
    await expect(reconcileDonation(d,true)).rejects.toThrow('registro'); expect(captures()).toHaveLength(0);
  });
});