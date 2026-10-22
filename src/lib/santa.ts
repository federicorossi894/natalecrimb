import { z } from "zod";

/** "Prenota il tuo Babbo Natale" — DEMO only. Values here are proposals to be confirmed by the Comitato. */
export const SANTA_CONTRIBUTION_EUR = 30;
export const SANTA_CONTRIBUTION_NOTE = "importo indicativo da confermare";
export const SANTA_REFERENCES = [
  { who: "CRI Brugherio", eur: 25 },
  { who: "UILDM Milano", eur: 60 },
] as const;
export const SANTA_SLOTS = ["Prima serata · indicativa", "Seconda serata · indicativa", "Indifferente"] as const;

const personName = z
  .string()
  .trim()
  .min(2, "Almeno 2 caratteri")
  .max(40, "Massimo 40 caratteri")
  .regex(/^[\p{L} .'’-]+$/u, "Usa solo lettere");

/** Client-side validation only: booking data is never sent or stored anywhere. */
export const santaBookingSchema = z.object({
  nome: personName,
  cognome: personName,
  email: z.string().trim().max(120, "Email troppo lunga").email("Email non valida"),
  telefono: z.string().trim().regex(/^\+?[0-9][0-9 ]{7,15}$/, "Telefono non valido (es. 333 1234567)"),
  indirizzo: z.string().trim().min(6, "Indirizzo troppo corto").max(120, "Massimo 120 caratteri"),
  bambini: z.coerce.number().int("Numero intero").min(1, "Almeno 1 bambino").max(8, "Massimo 8 bambini"),
  nomiBambini: z.string().trim().max(120, "Massimo 120 caratteri"),
  fascia: z.string().refine((v) => (SANTA_SLOTS as readonly string[]).includes(v), "Scegli una fascia preferita"),
  note: z.string().trim().max(300, "Massimo 300 caratteri"),
  demo: z.boolean().refine((v) => v, "Conferma di aver capito che è una simulazione"),
});

export type SantaForm = { [K in keyof z.input<typeof santaBookingSchema>]: K extends "demo" ? boolean : string };

export const emptySantaForm = (): SantaForm => ({
  nome: "", cognome: "", email: "", telefono: "", indirizzo: "", bambini: "", nomiBambini: "", fascia: "", note: "", demo: false,
});
