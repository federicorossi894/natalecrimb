// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { ACTIVE_CAMPAIGN_MODE, CAMPAIGN, LIVE_READINESS, LIVE_PROVIDER_READINESS, OPTIONAL_SERVICE_READINESS, CAMPAIGN_OPTIONS, campaignPaymentMethods, campaignRouteAllowed } from '@/lib/campaign';
import { OFFICIAL_EMAIL_READINESS, officialEmailReady } from '@/lib/email-readiness';
import { SITE_EXPERIENCE } from '@/lib/site-experience';
import { requirePaymentQa } from '@/lib/payment-qa-auth.server';

it('authorized BASIC uses only the two verified online providers', () => {
  expect(ACTIVE_CAMPAIGN_MODE).toBe('BASIC');
  expect(SITE_EXPERIENCE).toBe('ONLINE_GIFT');
  expect(LIVE_READINESS).toEqual({payments:true,cash:false,purchaseWishQR:false,liveData:true});
  expect(LIVE_PROVIDER_READINESS.sumup.webhookVerified).toBe(true);
  expect(LIVE_PROVIDER_READINESS.paypal.webhookVerified).toBe(true);
  expect(campaignPaymentMethods()).toEqual(['sumup','paypal']);
});
it('enables verified email paths without enabling Santa cash QR or physical prizes', () => {
  expect(OPTIONAL_SERVICE_READINESS).toEqual({santaBookings:false,emailSending:true,emailScheduling:true});
  expect(CAMPAIGN_OPTIONS).toEqual({santaHomeVisitsEnabled:false,courtesyBiscuitAvailable:false});
  expect(OFFICIAL_EMAIL_READINESS.receiptImplementedAndVerified).toBe(true);
  expect(OFFICIAL_EMAIL_READINESS.giftNowImplementedAndVerified).toBe(true);
  expect(OFFICIAL_EMAIL_READINESS.giftChristmasScheduleVerified).toBe(true);
  expect(officialEmailReady()).toBe(true);
  expect(CAMPAIGN.volunteerCashDonations).toBe(false);
  expect(CAMPAIGN.volunteerPurchaseWishQR).toBe(false);
  expect(CAMPAIGN.publicWishWall).toBe(false);
  expect(CAMPAIGN.courtesyBiscuit).toBe(false);
  expect(campaignRouteAllowed('/albero-live')).toBe(false);
});
it('BASIC denies QA registration before checking identity or touching a provider', async () => {
  const getUser=vi.fn();
  await expect(requirePaymentQa({supabase:{auth:{getUser}},userId:'test'})).rejects.toThrow('Collaudo chiuso');
  expect(getUser).not.toHaveBeenCalled();
});