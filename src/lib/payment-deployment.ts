/** An exact server deployment allowlist, never a browser/forwarded-host override. */
export const PUBLIC_PAYMENT_ORIGINS = [
  "https://natalecrimb.lovable.app",
  "https://project--f6dd90ba-cd6d-4316-8b9b-58f8b12e499e.lovable.app",
] as const;
export function paymentOrigin(requestUrl: string, configuredOrigin?: string) {
  const requested = new URL(requestUrl);
  const origin = configuredOrigin ? new URL(configuredOrigin) : requested;
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    !PUBLIC_PAYMENT_ORIGINS.some((allowed) => allowed === origin.origin) ||
    requested.origin !== origin.origin
  )
    throw new Error("Dominio pagamenti non autorizzato.");
  return origin.origin;
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
