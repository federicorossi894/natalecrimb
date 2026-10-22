import { z } from "zod";

/** Gift email demo: preview + simulated confirmation only. Nothing is sent, scheduled or stored. */
export type EmailMode = "now" | "christmas";
export const EMAIL_SENDER = "natale@crimonza.org";
export const CHRISTMAS_DELIVERY = "25 dicembre · ore 00:05 (ora italiana)";

export const giftEmailSchema = z.object({
  mode: z.enum(["now", "christmas"]),
  donor: z.string().trim().max(40, "Massimo 40 caratteri nel nome"),
  to: z.string().trim().min(1, "Inserisci l'email del destinatario").email("Email del destinatario non valida").max(255),
  msg: z.string().trim().max(90, "Massimo 90 caratteri nella dedica"),
});

export function deliveryLabel(mode: EmailMode) {
  return mode === "now" ? "Subito, appena confermi" : CHRISTMAS_DELIVERY;
}

export function confirmationText(mode: EmailMode) {
  return mode === "now"
    ? "Invio simulato: nella versione reale l'email partirebbe adesso."
    : "Sorpresa simulata per il 25 dicembre alle 00:05 (ora italiana).";
}
