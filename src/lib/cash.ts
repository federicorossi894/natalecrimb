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

/** Same bounds are enforced again by the backend (hang_ornament, create_cash_request, volunteer_add_ornament). */
export const MIN_GIFT_EURO = 5;
export const MAX_GIFT_EURO = 1000;
/** Whole euros from 5 to 1000. Accepts numbers or typed text ("10", "10,00"); rejects 0, negatives, NaN, text and cents. */
export const amountSchema = z.preprocess(
  (v) => {
    if (typeof v === "string") {
      const s = v.trim().replace(",", ".");
      if (!s) return undefined;
      return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : Number.NaN;
    }
    return v;
  },
  z.number({ required_error: "Scrivi un importo in euro", invalid_type_error: "Scrivi un importo in euro, solo cifre" })
    .finite("Scrivi un importo in euro, solo cifre")
    .int("Solo euro interi, senza centesimi")
    .min(MIN_GIFT_EURO, `L'importo minimo è ${MIN_GIFT_EURO} €`)
    .max(MAX_GIFT_EURO, `L'importo massimo è ${MAX_GIFT_EURO} €`),
);

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

export type CashResult = { status: CashStatus; kind: string | null; amount_cents: number | null; ornament_id: string | null };
/** Owner of the one-time code (the donor's phone) learns which ornament was hung, to open the postcard step. */
export async function cashRequestResult(code: string): Promise<CashResult> {
  const { data, error } = await supabase.rpc("cash_request_result", { _code: code });
  if (error) throw new Error(error.message);
  const r = data?.[0];
  if (!r) return { status: "not_found", kind: null, amount_cents: null, ornament_id: null };
  return { status: r.status as CashStatus, kind: r.kind, amount_cents: r.amount_cents, ornament_id: r.ornament_id };
}

/**
 * The donor's pending cash gift lives only on their device (localStorage), so they can close the page, pay at the
 * casetta and come back later to send the postcard — without repeating the gift.
 */
export type StoredCashGift = { code: string; amount_cents: number; expires_at: string; kind: string; project: string; confirmed?: boolean; ornament_id?: string | null };
const CASH_KEY = "cri-cash-gift";
const KEEP_CONFIRMED_MS = 30 * 24 * 3600_000;
export function loadCashGift(): StoredCashGift | null {
  try {
    const s = JSON.parse(localStorage.getItem(CASH_KEY) ?? "null") as StoredCashGift | null;
    if (!s?.code) return null;
    const exp = new Date(s.expires_at).getTime();
    if (!s.confirmed && exp < Date.now()) { localStorage.removeItem(CASH_KEY); return null; }
    if (s.confirmed && exp + KEEP_CONFIRMED_MS < Date.now()) { localStorage.removeItem(CASH_KEY); return null; }
    return s;
  } catch { return null; }
}
export const saveCashGift = (g: StoredCashGift) => localStorage.setItem(CASH_KEY, JSON.stringify(g));
export const clearCashGift = () => localStorage.removeItem(CASH_KEY);
