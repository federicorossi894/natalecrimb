import { z } from 'zod';
import { type OnlineProvider } from './campaign';

// Browser-safe input rules; never accept provider evidence from the browser.
export const donationCheckoutSchema = z.object({
  provider: z.enum(['sumup', 'paypal']),
  kind: z.enum(['dae', 'calore', 'prossimita', 'cuore']),
  amount: z.number().int().min(5).max(1000),
  accessToken: z.string().regex(/^[a-f0-9]{64}$/),
  requestId: z.string().uuid(),
});
export const donationAccessSchema = z.object({ id: z.string().uuid(), accessToken: donationCheckoutSchema.shape.accessToken });
export type PaymentEvidence = { provider: OnlineProvider; providerId: string; paymentId: string; reference: string; amountCents: number; currency: string; paid: boolean };
export function decimalCents(value: unknown): number {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Importo provider non valido.');
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function validatePaymentEvidence(expected: { id: string; provider: string; provider_id: string | null; amount_cents: number }, proof: PaymentEvidence) {
  if (!proof.paid || !proof.paymentId || proof.provider !== expected.provider || proof.providerId !== expected.provider_id || proof.reference !== expected.id || proof.currency !== 'EUR' || proof.amountCents !== expected.amount_cents) throw new Error('Conferma pagamento non corrispondente.');
  return proof;
}