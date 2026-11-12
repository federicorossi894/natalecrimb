/** Production payments originate ONLY from the official CRI Monza domain.
 * Lovable preview and editor domains never initiate a real checkout.
 * Never use Host/X-Forwarded-Host, browser input or an arbitrary env override as a redirect target.
 */
export const PUBLIC_PAYMENT_ORIGINS = ["https://natale.crimonza.org"] as const;
export function paymentOrigin(requestUrl: string, configuredOrigin?: string) {
  const request = new URL(requestUrl);
  const official = PUBLIC_PAYMENT_ORIGINS[0];
  if (
    request.origin !== official ||
    request.username || request.password ||
    (configuredOrigin && configuredOrigin !== official)
  ) throw new Error("Effettua il pagamento soltanto su natale.crimonza.org.");
  return official;
}
export const PAYPAL_WEBHOOK_EVENTS = [
  "CHECKOUT.ORDER.APPROVED",
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.PENDING",
  "PAYMENT.CAPTURE.DENIED",
  "CHECKOUT.PAYMENT-APPROVAL.REVERSED",
  "PAYMENT.CAPTURE.REVERSED",
  "PAYMENT.CAPTURE.REFUNDED",
] as const;
