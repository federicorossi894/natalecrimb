import { describe, expect, it } from 'vitest';
import { campaignCapabilities } from '@/lib/campaign';
import { assertGiftEmailService, christmasDeliveryIso, giftEmailIdempotencyKey, GIFT_EMAIL_POLICY } from '@/lib/gift-email-policy';
import { giftDeliveryTime } from '@/lib/donation-email-policy';

describe('Real email readiness contract', () => {
  it('uses the owner-selected sender without asserting operational readiness', () => expect(GIFT_EMAIL_POLICY.intendedSender).toBe('natale@crimonza.org'));
  it('Christmas delivery is December 25 at 00:05 Europe/Rome', () => {
    expect(christmasDeliveryIso(2026)).toBe('2026-12-24T23:05:00.000Z');
    expect(christmasDeliveryIso(2027)).toBe('2027-12-24T23:05:00.000Z');
    expect(GIFT_EMAIL_POLICY.timeZone).toBe('Europe/Rome');
  });
  it('only schedules 2026 Christmas at 00:05 CET and rejects requests after the deadline', () => {
    expect(giftDeliveryTime('christmas',new Date('2026-11-12T10:00:00Z'))).toBe('2026-12-24T23:05:00.000Z');
    expect(giftDeliveryTime('now',new Date('2026-12-25T23:00:00Z'))).toBeNull();
    expect(() => giftDeliveryTime('christmas',new Date('2026-12-24T23:05:01Z'))).toThrow('trascorsa');
    expect(() => giftDeliveryTime('christmas',new Date('2027-01-01T00:00:00Z'))).toThrow('trascorsa');
  });
  it('retries use the same event and mode key, without recipient data', () => {
    expect(giftEmailIdempotencyKey('paid-gift-123', 'christmas')).toBe('gift-email:paid-gift-123:christmas');
    expect(giftEmailIdempotencyKey('paid-gift-123', 'now')).not.toBe(giftEmailIdempotencyKey('paid-gift-123', 'christmas'));
    expect(() => giftEmailIdempotencyKey('person@example.org', 'now')).toThrow();
  });
  it('unconfigured live email cannot report an accepted send', () => {
    expect(() => assertGiftEmailService('now', campaignCapabilities('BASIC', undefined, undefined, {santaBookings:false,emailSending:false,emailScheduling:false}))).toThrow();
    expect(() => assertGiftEmailService('christmas', campaignCapabilities('BASIC', undefined, undefined, {santaBookings:false,emailSending:false,emailScheduling:false}))).toThrow();
  });
  it('sending readiness alone does not enable scheduling', () => {
    const c = campaignCapabilities('BASIC', { payments: false, cash: false, purchaseWishQR: false, liveData: true }, undefined, { santaBookings: false, emailSending: true, emailScheduling: false });
    expect(() => assertGiftEmailService('now', c)).not.toThrow();
    expect(() => assertGiftEmailService('christmas', c)).toThrow();
  });
});