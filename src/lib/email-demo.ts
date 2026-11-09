import { z } from "zod";

/** Gift email demo: preview + simulated confirmation only. Nothing is sent, scheduled or stored. */
export type EmailMode = "now" | "christmas";
export type EmailAudience = "recipient" | "donor";
export const EMAIL_SENDER = "federico.rossi@crimonza.org";
/** Christmas surprise: 25 December, 00:05 Europe/Rome. */
export const CHRISTMAS_DELIVERY = "25 dicembre · ore 00:05 (ora italiana)";
export const CHRISTMAS_DELIVERY_ISO = "2026-12-24T23:05:00.000Z";

export const MODE_LABEL: Record<EmailMode, string> = { now: "Invia ora", christmas: "Invia a Natale" };

export const giftEmailSchema = z.object({
  mode: z.enum(["now", "christmas"]),
  donor: z.string().trim().max(40, "Massimo 40 caratteri nel nome"),
  toName: z.string().trim().max(40, "Massimo 40 caratteri nel nome del destinatario").optional().default(""),
  to: z.string().trim().min(1, "Inserisci l'indirizzo email").email("Indirizzo email non valido").max(255),
  msg: z.string().trim().max(90, "Massimo 90 caratteri nella dedica"),
});

export function deliveryLabel(mode: EmailMode) {
  return mode === "now" ? "Subito, appena confermi" : CHRISTMAS_DELIVERY;
}

export function confirmationText(mode: EmailMode) {
  return mode === "now"
    ? "Invio simulato: nella versione reale l'email partirebbe adesso."
    : "Invio simulato per il 25 dicembre alle 00:05 (ora italiana).";
}
