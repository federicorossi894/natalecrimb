import { z } from "zod";
import { christmasDeliveryIso } from "./gift-email-policy";
export const privateEmailSchema = z
  .string()
  .trim()
  .email("Indirizzo email non valido")
  .max(254)
  .transform((v) => v.toLowerCase());
export const donorConfirmationSchema = z.discriminatedUnion("requested", [
  z.object({ requested: z.literal(false) }).strip(),
  z.object({ requested: z.literal(true), email: privateEmailSchema }).strict(),
]);
export type DonorConfirmation = z.infer<typeof donorConfirmationSchema>;
export const giftDeliverySchema = z
  .object({
    mode: z.enum(["now", "christmas"]),
    to: privateEmailSchema,
    donor: z.string().trim().max(40),
    toName: z.string().trim().max(40),
    msg: z.string().trim().max(90),
    recipientExpected: z.literal(true),
  })
  .strict();
export type GiftDelivery = z.infer<typeof giftDeliverySchema>;
export type DeliveryKind = "receipt" | "gift";
export type DeliveryState =
  "not_requested" | "blocked" | "claimed" | "accepted" | "failed" | "suppressed" | "cancelled";
export function donationEmailKey(id: string, kind: DeliveryKind) {
  z.string().uuid().parse(id);
  return `natale:${id}:${kind}:v1`; // No recipient/amount, unchanged across every retry.
}
export function maySendDonationEmail(
  d: { status: string; settlement_state: string },
  requested: boolean,
  demo: boolean,
) {
  return !demo && requested && d.status === "paid" && d.settlement_state === "completed";
}
export function giftDeliveryTime(mode: "now" | "christmas", now: Date) {
  if (mode === "now") return null;
  const year = Number(
    new Intl.DateTimeFormat("en", { timeZone: "Europe/Rome", year: "numeric" }).format(now),
  );
  const date = christmasDeliveryIso(year);
  if (Date.parse(date) <= now.getTime())
    throw new Error("La consegna di Natale per questa campagna è già trascorsa. Scegli invia ora.");
  return date;
}
