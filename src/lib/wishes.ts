import { CAMPAIGN } from "./campaign";
import { campaignRpc } from "@/lib/campaign-rpc";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCode } from "./cash";

/**
 * Muro degli auguri. Nobody can post freely: after a purchase at the casetta an authenticated volunteer creates
 * ONE one-time code (7 days, only its hash is stored). The holder writes one wish; staff moderate every wish
 * before it appears. Pending, rejected and hidden wishes never reach the site or the TV.
 */
export const WISH_MAX = 180;
export const NICK_MAX = 24;
export const WISH_TOKEN_DAYS = 7;
export const DEMO_WISH_CODE = "demo";

export const wishSchema = z.object({
  body: z.string().trim().min(2, "Scrivi il tuo augurio").max(WISH_MAX, `Massimo ${WISH_MAX} caratteri`),
  nickname: z.string().trim().max(NICK_MAX, `Massimo ${NICK_MAX} caratteri`).regex(/^[\p{L}\p{N} .'’-]*$/u, "Nel soprannome usa solo lettere, numeri e spazi"),
  consent: z.literal(true, { errorMap: () => ({ message: "Per appendere l'augurio serve il tuo consenso alla pubblicazione" }) }),
});

/** Gentle client-side hints (the server flags the same patterns for moderators). Never blocks on its own. */
export function contactHints(text: string): string[] {
  const t = text.toLowerCase();
  const hints: string[] = [];
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(t)) hints.push("un indirizzo email");
  if (/[0-9]{7,}/.test(t.replace(/[\s.\-/()+]/g, ""))) hints.push("un numero di telefono");
  if (/(https?:\/\/|www\.|[a-z0-9-]+\.(it|com|org|net|eu|info)(\s|\/|$))/.test(t)) hints.push("un link");
  if (/(^|\s)@[a-z0-9_.]{3,}/.test(t)) hints.push("un profilo social");
  return hints;
}

export type WishState = "available" | "used" | "expired" | "not_found";
export type WishLookup = { state: WishState; expires_at: string | null; body: string | null; nickname: string | null; wish_status: string | null };
export type WishSubmit = { result: "ok" | "already_used" | "expired" | "not_found"; wish_status: string | null };
export type WishApi = {
  lookup(code: string): Promise<WishLookup>;
  submit(code: string, body: string, nickname: string, consent: boolean): Promise<WishSubmit>;
};

export const realWishApi: WishApi = {
  async lookup(code) {
    const { data, error } = await campaignRpc("wish_lookup", { _code: normalizeCode(code) });
    if (error) throw new Error(error.message);
    const r = data?.[0];
    if (!r) return { state: "not_found", expires_at: null, body: null, nickname: null, wish_status: null };
    return { state: r.state as WishState, expires_at: r.expires_at, body: r.body ?? null, nickname: r.nickname ?? null, wish_status: r.wish_status ?? null };
  },
  async submit(code, body, nickname, consent) {
    const { data, error } = await campaignRpc("submit_wish", { _code: normalizeCode(code), _body: body, _nickname: nickname, _consent: consent });
    if (error) throw new Error(error.message);
    const r = data?.[0];
    return { result: (r?.result ?? "not_found") as WishSubmit["result"], wish_status: r?.wish_status ?? null };
  },
};

export async function createWishToken() {
  const { data, error } = await campaignRpc("create_wish_token");
  if (error) throw new Error(error.message);
  const r = data?.[0];
  if (!r) throw new Error("Codice non creato");
  return { code: r.code, expires_at: r.expires_at };
}

/** In-memory twin for presentations: same screens, nothing saved, nothing published. */
export function createDemoWishApi(): WishApi & { newCode(): { code: string; expires_at: string } } {
  const store = new Map<string, WishLookup>();
  const fresh = (): WishLookup => ({ state: "available", expires_at: new Date(Date.now() + WISH_TOKEN_DAYS * 864e5).toISOString(), body: null, nickname: null, wish_status: null });
  store.set(DEMO_WISH_CODE, fresh());
  let n = 0;
  return {
    async lookup(code) { return store.get(code) ?? { state: "not_found", expires_at: null, body: null, nickname: null, wish_status: null }; },
    async submit(code, body, nickname, consent) {
      const r = store.get(code);
      if (!r) return { result: "not_found", wish_status: null };
      if (r.state === "used") return { result: "already_used", wish_status: r.wish_status };
      if (!consent) throw new Error("Serve il consenso alla pubblicazione");
      Object.assign(r, { state: "used", body: body.trim(), nickname: nickname.trim() || null, wish_status: "pending" });
      return { result: "ok", wish_status: "pending" };
    },
    newCode() {
      const code = `${DEMO_WISH_CODE}-${++n}`;
      const f = fresh();
      store.set(code, f);
      return { code, expires_at: f.expires_at! };
    },
  };
}

export const wishUrl = (code: string) => `${typeof window === "undefined" ? "" : window.location.origin}/augurio/${code}`;

export type PublicWish = { id: string; body: string; nickname: string | null; demo?: boolean };

/** Fictional examples, always labelled "Esempio · DEMO" and shown only while the wall has few real wishes. */
export const DEMO_WISHES: PublicWish[] = [
  { id: "demo-1", body: "Che questo Natale porti un po' di calore a chi ne ha più bisogno. Grazie a chi c'è sempre.", nickname: "Una famiglia di Monza", demo: true },
  { id: "demo-2", body: "Auguri a tutti i volontari: siete la luce più bella della piazza!", nickname: "Ale", demo: true },
  { id: "demo-3", body: "Buone feste a chi lavora mentre noi festeggiamo.", nickname: null, demo: true },
  { id: "demo-4", body: "Il mio desiderio: che nessuno passi la Vigilia da solo.", nickname: "Nonna Pina", demo: true },
  { id: "demo-5", body: "Gentilezza chiama gentilezza. Buon Natale, Monza!", nickname: "Marco e Giulia", demo: true },
  { id: "demo-6", body: "Un abbraccio grande a chi questo Natale sente la mancanza di qualcuno.", nickname: null, demo: true },
  { id: "demo-7", body: "Pace, salute e cioccolata calda per tutti!", nickname: "La 4ªB", demo: true },
  { id: "demo-8", body: "Grazie per esserci, ogni giorno dell'anno e non solo a Natale.", nickname: "Lucia", demo: true },
];
/** Below this many real wishes the wall also shows the labelled examples. */
export const DEMO_UNTIL = 12;
export const wallWishes = (real: PublicWish[]) => (!CAMPAIGN.demo || real.length >= DEMO_UNTIL ? real : [...real, ...DEMO_WISHES]);

export function usePublicWishes(refreshMs = 60_000) {
  const [wishes, setWishes] = useState<PublicWish[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!CAMPAIGN.publicWishWall) { setLoaded(true); return; }
    let alive = true;
    const load = () => campaignRpc("public_wishes").then(({ data, error }) => {
      if (!alive) return;
      if (!error) setWishes((data ?? []).map((w) => ({ id: w.id, body: w.body, nickname: w.nickname ?? null })));
      setLoaded(true);
    });
    void load();
    const t = setInterval(load, refreshMs);
    return () => { alive = false; clearInterval(t); };
  }, [refreshMs]);
  return { wishes, loaded };
}

/** Deterministic "hand-pinned" look per note: same tilt and paper for everyone, no randomness at render. */
export function noteLook(id: string) {
  const hash = (salt: number) => {
    let h = 2166136261 ^ salt;
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return (h >>> 0) / 4294967295;
  };
  return {
    rotate: Math.round((hash(1) * 9 - 4.5) * 10) / 10,
    lift: Math.round(hash(2) * 12),
    paper: (["ivory", "kraft", "snow", "blush"] as const)[Math.min(3, Math.floor(hash(3) * 4))]!,
    pin: Math.round((hash(4) * 14 - 7) * 10) / 10,
  };
}

export const MODERATION_FLAG_LABEL: Record<string, string> = {
  link: "Contiene un link",
  email: "Contiene un'email",
  telefono: "Possibile numero di telefono",
  social: "Possibile profilo social",
  linguaggio: "Linguaggio da verificare",
  indirizzo: "Possibile indirizzo",
};
