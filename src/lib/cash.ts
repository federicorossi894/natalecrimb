import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PROJECTS, type OrnamentKind } from "./data";
import { clientId, dedicaSchema } from "./tree-store";

/**
 * Cash at the casetta (DEMO). The visitor's phone gets a one-time 16-character code (80 random bits, generated
 * server-side; only its hash is stored). Nothing is hung on the tree until an authenticated volunteer confirms it.
 */
export type OnlineMethod = "sumup" | "paypal";
export type PaymentChoice = OnlineMethod | "cash";
export type DeskMethod = "cash" | "pos_manual";
export const DESK_METHOD_LABEL: Record<DeskMethod, string> = {
  cash: "Contanti ricevuti",
  pos_manual: "SumUp POS confermato manualmente",
};

/** Accepts what a volunteer may type or scan: lowercase, spaces/dashes, O/I/L typed instead of 0/1. */
export function normalizeCode(raw: string) {
  return raw.toUpperCase().replace(/[OIL]/g, (c) => (c === "O" ? "0" : "1")).replace(/[^0-9A-Z]/g, "");
}
export const isCompleteCode = (raw: string) => /^[0-9A-HJKMNP-TV-Z]{16}$/.test(normalizeCode(raw));
export const formatCode = (raw: string) => normalizeCode(raw).replace(/(.{4})(?=.)/g, "$1-");
export const euro = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
export const projectForKind = (kind: string) => PROJECTS.find((p) => p.ornament === kind);

export const amountSchema = z.coerce.number({ message: "Importo non valido" }).int("Solo euro interi").min(1, "Minimo 1 €").max(1000, "Massimo 1000 €");

export const manualOrnamentSchema = z.object({
  kind: z.enum(["dae", "calore", "prossimita", "cuore"]),
  amount: amountSchema,
  method: z.enum(["cash", "pos_manual"]),
  firma: dedicaSchema.shape.firma,
  dedica: dedicaSchema.shape.dedica,
  consent: z.boolean(),
  simulated: z.literal(true, { message: "Conferma che si tratta di un passaggio simulato" }),
});

export async function createCashRequest(kind: OrnamentKind, amountEuro: number, firma: string, dedica: string, consent: boolean) {
  const { data, error } = await supabase.rpc("create_cash_request", {
    _kind: kind, _amount_cents: Math.round(amountEuro * 100), _firma: consent ? firma : "", _dedica: consent ? dedica : "", _consent: consent, _client: clientId(),
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) throw new Error("Richiesta non creata");
  return row;
}

export type CashStatus = "pending" | "confirmed" | "expired" | "not_found";
export async function cashRequestStatus(code: string): Promise<CashStatus> {
  const { data, error } = await supabase.rpc("cash_request_status", { _code: code });
  if (error) throw new Error(error.message);
  return (data as CashStatus) ?? "not_found";
}
