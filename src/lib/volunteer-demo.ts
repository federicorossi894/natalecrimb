import type { OrnamentKind } from "./data";
import { normalizeCode, type DeskMethod } from "./cash";

/**
 * Presentation mode for /volontari: the same desk flows as the real area, backed by an in-memory sandbox.
 * Nothing here talks to Lovable Cloud, so it can be shown without an account and never touches real data.
 */
export type DeskLookup = { status: string; kind: string; amount_cents: number; firma: string | null; dedica: string | null; publish_consent: boolean; expires_at: string; confirmed_at: string | null; method: string | null };
export type DeskAdd = { kind: OrnamentKind; amount_cents: number; method: DeskMethod; firma: string; dedica: string; consent: boolean };
export type DeskApi = {
  lookup(code: string): Promise<DeskLookup | null>;
  confirm(code: string, method: DeskMethod): Promise<{ result: string; ornament_status: string | null }>;
  add(input: DeskAdd): Promise<{ status: string }>;
};
export type DemoEntry = { kind: string; amount_cents: number; method: DeskMethod; source: "qr" | "manuale"; status: string; firma: string | null };

export const DEMO_CODE = "D3M0CR1M0NZA2025";
const ABC = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const textStatus = (f: string | null, d: string | null) =>
  !f && !d ? "approved" : /(cazz|merd|stronz|vaffan|puttan|coglion|idiot|http|www\.)/i.test(`${d ?? ""} ${f ?? ""}`) ? "rejected" : "pending";
const inTwoHours = () => new Date(Date.now() + 2 * 3600_000).toISOString();

export function createDemoDesk(onLog: (e: DemoEntry) => void) {
  const requests = new Map<string, DeskLookup>();
  const seed = (code: string, kind: OrnamentKind, amount: number, firma: string | null, dedica: string | null) =>
    requests.set(normalizeCode(code), { status: "pending", kind, amount_cents: amount * 100, firma, dedica, publish_consent: !!(firma || dedica), expires_at: inTwoHours(), confirmed_at: null, method: null });
  seed(DEMO_CODE, "dae", 20, "Giulia", "Per chi salva una vita ogni giorno");
  const kinds: OrnamentKind[] = ["calore", "prossimita", "cuore", "dae"];
  let n = 0;
  const api: DeskApi & { newRequest(): string } = {
    async lookup(code) { return requests.get(normalizeCode(code)) ?? null; },
    async confirm(code, method) {
      const r = requests.get(normalizeCode(code));
      if (!r) return { result: "not_found", ornament_status: null };
      if (r.status === "confirmed") return { result: "already_confirmed", ornament_status: textStatus(r.firma, r.dedica) };
      const st = textStatus(r.firma, r.dedica);
      r.status = "confirmed"; r.confirmed_at = new Date().toISOString(); r.method = method;
      onLog({ kind: r.kind, amount_cents: r.amount_cents, method, source: "qr", status: st, firma: r.firma });
      return { result: "confirmed", ornament_status: st };
    },
    async add(i) {
      const f = i.consent ? i.firma.trim() || null : null, d = i.consent ? i.dedica.trim() || null : null, st = textStatus(f, d);
      onLog({ kind: i.kind, amount_cents: i.amount_cents, method: i.method, source: "manuale", status: st, firma: f });
      return { status: st };
    },
    newRequest() {
      let code = "";
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      for (const b of bytes) code += ABC[b % 32];
      const kind = kinds[n++ % kinds.length]!;
      seed(code, kind, [10, 15, 30, 50][n % 4]!, null, null);
      return code;
    },
  };
  return api;
}
