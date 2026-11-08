import { describe, expect, it } from 'vitest';
import { CAMPAIGN, assertCampaignPayment, assertCampaignRpc, campaignCapabilities, campaignPaymentMethods, type ProviderReadiness } from '@/lib/campaign';

const ready = { payments: true, cash: true, purchaseWishQR: true, liveData: true };
const providers: ProviderReadiness = {
  sumup: { implemented: true, configured: true, webhookVerified: true },
  paypal: { implemented: true, configured: true, webhookVerified: true },
};
describe('Verified providers and explicit payment execution', () => {
  it('DEMO retains SumUp/PayPal simulators and cash, never live execution', () => {
    expect(campaignPaymentMethods(CAMPAIGN)).toEqual(['sumup', 'paypal', 'cash']);
    expect(() => assertCampaignPayment('sumup', 'demo')).not.toThrow();
    expect(() => assertCampaignPayment('sumup', 'live')).toThrow();
    expect(() => assertCampaignPayment('cash', 'live')).toThrow();
  });
  it.each(['BASIC', 'ADVANCED_1', 'ADVANCED_2'] as const)('%s currently remains fail-closed', mode => {
    expect(campaignPaymentMethods(campaignCapabilities(mode))).toEqual([]);
  });
  it.each(['BASIC', 'ADVANCED_1', 'ADVANCED_2'] as const)('%s ready offers verified online methods and tier-appropriate cash', mode => {
    const c = campaignCapabilities(mode, ready, undefined, undefined, providers);
    expect(c.livePayments).toBe(true);
    expect(campaignPaymentMethods(c)).toEqual(mode === 'BASIC' ? ['sumup', 'paypal'] : ['sumup', 'paypal', 'cash']);
    expect(() => assertCampaignPayment('sumup', 'live', c)).not.toThrow();
    expect(() => assertCampaignPayment('paypal', 'demo', c)).toThrow();
    expect(() => assertCampaignRpc('hang_ornament', 'public', c)).toThrow();
  });
  it('BASIC offers only the individual verified provider, not cash', () => {
    const c = campaignCapabilities('BASIC', ready, undefined, undefined, { ...providers, paypal: { ...providers.paypal, webhookVerified: false } });
    expect(campaignPaymentMethods(c)).toEqual(['sumup']);
    expect(() => assertCampaignPayment('paypal', 'live', c)).toThrow();
    expect(() => assertCampaignPayment('cash', 'live', c)).toThrow();
  });
  it.each(['implemented', 'configured', 'webhookVerified'] as const)('missing %s denies a provider even with global readiness', key => {
    const unavailable = { implemented: true, configured: true, webhookVerified: true, [key]: false };
    const c = campaignCapabilities('BASIC', ready, undefined, undefined, { sumup: unavailable, paypal: unavailable });
    expect(c.livePayments).toBe(false);
    expect(campaignPaymentMethods(c)).toEqual([]);
    expect(() => assertCampaignPayment('sumup', 'live', c)).toThrow();
  });
  it('provider readiness cannot bypass global payment/data readiness', () => {
    for (const r of [{ ...ready, payments: false }, { ...ready, liveData: false }]) expect(campaignPaymentMethods(campaignCapabilities('BASIC', r, undefined, undefined, providers))).toEqual([]);
  });
  it('DEMO never promotes providers to real even with readiness injected', () => {
    const c = campaignCapabilities('DEMO', ready, undefined, undefined, providers);
    expect(c.liveOnlineProviders).toEqual([]);
    expect(campaignPaymentMethods(c)).toEqual(['sumup', 'paypal', 'cash']);
    expect(() => assertCampaignPayment('paypal', 'live', c)).toThrow();
  });
  it.each(['ADVANCED_1', 'ADVANCED_2'] as const)('%s cash readiness is independent from online provider readiness', mode => {
    const c = campaignCapabilities(mode, ready);
    expect(campaignPaymentMethods(c)).toEqual(['cash']);
    expect(() => assertCampaignPayment('cash', 'live', c)).not.toThrow();
    expect(() => assertCampaignPayment('sumup', 'live', c)).toThrow();
  });
});