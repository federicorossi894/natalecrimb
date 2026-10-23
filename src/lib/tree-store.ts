import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { TREE_ORNAMENTS, MOCK_TOTAL_GIFTS, type OrnamentKind, type TreeOrnament } from "./data";

/** DEMO tree shared across devices via Lovable Cloud. Donations are always simulated. */
export type MyOrnament = { id: string; kind: string; dedica: string | null; status: string; publish_consent: boolean };

export const dedicaSchema = z.object({
  firma: z.string().trim().max(40, "Massimo 40 caratteri").regex(/^[\p{L}\p{N} .,'’!-]*$/u, "Caratteri non ammessi nella firma"),
  dedica: z.string().trim().max(90, "Massimo 90 caratteri"),
  consent: z.boolean(),
});

const CLIENT_KEY = "cri-demo-client-id";
export function clientId() {
  let id = localStorage.getItem(CLIENT_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(CLIENT_KEY, id); }
  return id;
}

const EVT = "cri-demo-tree";
export const POLL_MS = 15000;

export async function addOrnament(kind: OrnamentKind, amountEuro: number, firma: string, dedica: string, consent: boolean) {
  const { data, error } = await supabase.rpc("hang_ornament", { _kind: kind, _amount_cents: Math.round(amountEuro * 100), _firma: firma, _dedica: dedica, _consent: consent, _client: clientId() });
  if (error) throw new Error(error.message);
  window.dispatchEvent(new Event(EVT));
  return data?.[0] ?? null;
}

export function useTreeStore() {
  const [remote, setRemote] = useState<TreeOrnament[]>([]);
  const [mine, setMine] = useState<MyOrnament[]>([]);
  const [error, setError] = useState(false);
  const sync = useCallback(async () => {
    const [t, m] = await Promise.all([supabase.rpc("public_tree"), supabase.rpc("my_ornaments", { _client: clientId() })]);
    if (t.error) { setError(true); return; }
    setError(false);
    setRemote((t.data ?? []).reverse().map((o) => ({ id: o.id, kind: o.kind as OrnamentKind, x: o.x, y: o.y, ...(o.dedica ? { dedica: o.dedica } : {}), ...(o.firma ? { firma: o.firma } : {}) })));
    setMine(m.data ?? []);
  }, []);
  useEffect(() => {
    void sync();
    const t = setInterval(() => void sync(), POLL_MS);
    const h = () => void sync();
    window.addEventListener(EVT, h);
    return () => { clearInterval(t); window.removeEventListener(EVT, h); };
  }, [sync]);
  return { mine, error, addedOrnaments: remote, addedCount: remote.length, publicOrnaments: [...TREE_ORNAMENTS, ...remote], total: MOCK_TOTAL_GIFTS + remote.length, refresh: sync };
}
