import { CAMPAIGN, assertCampaignAction, type CampaignCapabilities } from './campaign';
import type { EmailMode } from './email-demo';

/** Readiness contract only: no queue, stored address or fictitious send. */
export const GIFT_EMAIL_POLICY = {
  intendedSender: 'natale@crimonza.org',
  timeZone: 'Europe/Rome',
  christmasMonth: 12, christmasDay: 25, christmasHour: 0, christmasMinute: 5,
} as const;
export type GiftEmailOutcome =
  | { state: "available"; mode: EmailMode }
  | { state: 'unavailable'; reason: 'sender_not_configured' | 'live_service_not_implemented' }
  | { state: 'sent' | 'scheduled'; eventId: string }
  | { state: 'suppressed'; eventId: string }
  | { state: 'failed'; eventId: string; retryAfterSeconds?: number };
/** Christmas is in CET: avoid the caller/device timezone deciding delivery. */
export function christmasDeliveryIso(year: number) {
  if (!Number.isInteger(year) || year < 2026 || year > 2100) throw new Error('Anno non valido');
  return new Date(Date.UTC(year, 11, 24, 23, 5)).toISOString();
}
/** A trusted paid-gift event, never recipient/address input, determines idempotency. */
export function giftEmailIdempotencyKey(eventId: string, mode: EmailMode) {
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(eventId)) throw new Error('Evento non valido');
  return `gift-email:${eventId}:${mode}`;
}
export function assertGiftEmailService(mode: EmailMode, capabilities: CampaignCapabilities = CAMPAIGN) {
  assertCampaignAction(mode === 'christmas' ? 'emailChristmas' : 'emailNow', capabilities);
}