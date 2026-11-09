import { describe, expect, it } from 'vitest';
import { ACTIVE_CAMPAIGN_MODE, CAMPAIGN_MODES, CAMPAIGN_OPTIONS, assertCampaignAction, assertCampaignRpc, campaignCapabilities, campaignPaymentMethods, campaignRouteAllowed } from '@/lib/campaign';
import { tvSequence } from '@/components/xmas/TreeTV';

describe('Campaign modes and fail-closed actions', () => {
  it('keeps DEMO active', () => expect(ACTIVE_CAMPAIGN_MODE).toBe('DEMO'));
  it('preserves all demonstration routes and payment simulators', () => {
    const c = campaignCapabilities('DEMO');
    for (const path of ['/tv-preview', '/presentazione', '/volontari', '/auguri', '/augurio/demo']) expect(campaignRouteAllowed(path, c, 'FULL')).toBe(true);
    expect(campaignPaymentMethods(c)).toEqual(['sumup', 'paypal', 'cash']);
  });
  it.each(['BASIC', 'ADVANCED_1', 'ADVANCED_2'] as const)('%s never enables unready live actions', mode => {
    const c = campaignCapabilities(mode);
    expect(c.demo).toBe(false);
    expect(c.livePayments).toBe(false);
    expect(c.volunteerCashDonations).toBe(false);
    expect(c.volunteerPurchaseWishQR).toBe(false);
    expect(campaignPaymentMethods(c)).toEqual([]);
    expect(() => assertCampaignRpc('hang_ornament', 'public', c)).toThrow();
    expect(() => assertCampaignRpc('submit_wish', 'public', c)).toThrow();
    expect(() => assertCampaignRpc('confirm_cash_request', 'volunteer', c)).toThrow();
  });
  it('BASIC excludes cash and wishes even with all prerequisites', () => {
    const c = campaignCapabilities('BASIC', { payments: true, cash: true, purchaseWishQR: true, liveData: true });
    expect(c.livePayments).toBe(false); // Global readiness alone does not verify any provider.
    expect(c.volunteerCashDonations).toBe(false);
    expect(c.publicWishWall).toBe(false);
    expect(campaignRouteAllowed('/augurio/a-code', c, 'FULL')).toBe(false);
  });
  it('ADVANCED_1 adds only cash donation capability', () => {
    const c = campaignCapabilities('ADVANCED_1', { payments: true, cash: true, purchaseWishQR: true, liveData: true });
    expect(c.volunteerCashDonations).toBe(true);
    expect(c.volunteerPurchaseWishQR).toBe(false);
    expect(c.wishModeration).toBe(false);
    expect(tvSequence(true, true, c)).not.toContain('auguri');
  });
  it('ADVANCED_2 requires purchase-QR readiness independently from payments', () => {
    const c = campaignCapabilities('ADVANCED_2', { payments: false, cash: true, purchaseWishQR: true, liveData: true });
    expect(c.publicWishWall).toBe(true);
    expect(c.wishModeration).toBe(true);
    expect(c.livePayments).toBe(false);
    expect(tvSequence(true, true, c)).toContain('auguri');
  });
  it.each(CAMPAIGN_MODES)('%s keeps independent content and protects staff RPCs', mode => {
    const c = campaignCapabilities(mode);
    for (const path of ['/calendario', '/casetta', '/piccoli-volontari', '/albero', '/regali/calore']) expect(campaignRouteAllowed(path, c, 'FULL')).toBe(true);
    expect(() => assertCampaignRpc('confirm_cash_request', 'public', c)).toThrow();
    expect(() => assertCampaignRpc('create_wish_token', 'public', c)).toThrow();
    expect(() => assertCampaignRpc('moderate_wish', 'volunteer', c)).toThrow();
  });
  it('LIVE deep links cannot invoke demonstration previews', () => {
    for (const mode of ['BASIC', 'ADVANCED_1', 'ADVANCED_2'] as const) {
      const c = campaignCapabilities(mode);
      expect(campaignRouteAllowed('/tv-preview/', c, 'FULL')).toBe(false);
      expect(campaignRouteAllowed('/presentazione', c, 'FULL')).toBe(false);
    }
  });
  it.each(CAMPAIGN_MODES)('%s retains the complete autonomous experience', mode => {
    const c = campaignCapabilities(mode);
    for (const feature of ['onlineDonations', 'persistentOrnaments', 'dedications', 'whatsappPostcards', 'giftEmails', 'calendar', 'academy', 'diploma', 'casetta', 'tv'] as const) expect(c[feature]).toBe(true);
  });
  it.each(['BASIC', 'ADVANCED_1', 'ADVANCED_2'] as const)('%s hides unapproved home visits without removing academy', mode => {
    const c = campaignCapabilities(mode);
    expect(c.santaHomeVisitsVisible).toBe(false);
    expect(campaignRouteAllowed('/babbo-natale', c, 'FULL')).toBe(false);
    expect(campaignRouteAllowed('/babbo-natale/prenota', c, 'FULL')).toBe(false);
    expect(campaignRouteAllowed('/piccoli-volontari', c, 'FULL')).toBe(true);
    expect(() => assertCampaignAction('santaBooking', c)).toThrow();
    expect(c.courtesyBiscuit).toBe(false);
  });
  it('keeps optional services off until approval while DEMO remains visible', () => {
    expect(CAMPAIGN_OPTIONS).toEqual({ santaHomeVisitsEnabled: false, courtesyBiscuitAvailable: false });
    expect(campaignCapabilities('DEMO').courtesyBiscuit).toBe(true);
    expect(campaignRouteAllowed('/babbo-natale', campaignCapabilities('DEMO'), 'FULL')).toBe(true);
  });
  it('Santa approval is independent of tier and not booking readiness', () => {
    for (const mode of ['BASIC', 'ADVANCED_1', 'ADVANCED_2'] as const) {
      const c = campaignCapabilities(mode, undefined, { santaHomeVisitsEnabled: true, courtesyBiscuitAvailable: true });
      expect(c.santaHomeVisitsVisible).toBe(true);
      expect(c.courtesyBiscuit).toBe(true);
      expect(c.santaHomeVisitsOperational).toBe(false);
      expect(() => assertCampaignAction('santaBooking', c)).toThrow();
    }
  });
  it.each(CAMPAIGN_MODES)('%s denies all unready LIVE server actions', mode => {
    const c = campaignCapabilities(mode);
    for (const action of ['onlinePayment', 'cashDonation', 'purchaseWishQR', 'wishModeration', 'emailNow', 'emailChristmas', 'santaBooking'] as const) expect(() => assertCampaignAction(action, c)).toThrow();
  });
  it('approved biscuit in BASIC never enables cash or wall', () => {
    const c = campaignCapabilities('BASIC', undefined, { santaHomeVisitsEnabled: false, courtesyBiscuitAvailable: true });
    expect(c.courtesyBiscuit).toBe(true);
    expect(c.volunteerCashDonations).toBe(false);
    expect(c.publicWishWall).toBe(false);
  });
});