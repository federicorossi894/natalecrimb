import { ONLINE_GIFT } from './site-experience';
import { CAMPAIGN } from "./campaign";
import { livePublicTree } from './payments.functions';
import { publicTvTree } from './tv-tree.functions';
import { campaignRpc } from "@/lib/campaign-rpc";
import { useEffect, useState } from "react";
import { mergeSessionOrnaments, sessionOrnaments, SESSION_TREE_EVENT, type SessionOrnament } from './online-gift-session';
import { useResilientPoll } from './resilient-poll';
import { z } from "zod";
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
  try {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(CLIENT_KEY, id); }
    return id;
  } catch {
    // Restricted storage: preserve a page-local identity rather than crashing the public tree.
    transientClient ??= crypto.randomUUID();
    return transientClient;
  }
}
let transientClient: string | undefined;

const EVT = "cri-demo-tree";
export const POLL_MS = 15000;

export async function addOrnament(kind: OrnamentKind, amountEuro: number, firma: string, dedica: string, consent: boolean) {
  const { data, error } = await campaignRpc("hang_ornament", { _kind: kind, _amount_cents: Math.round(amountEuro * 100), _firma: firma, _dedica: dedica, _consent: consent, _client: clientId() });
  if (error) throw new Error(error.message);
  window.dispatchEvent(new Event(EVT));
  return data?.[0] ?? null;
}

export function useTreeStore(options: { publicOnly?: boolean } = {}) {
  const publicOnly = options.publicOnly ?? false;
  const [local, setLocal] = useState<SessionOrnament[]>([]);
  useEffect(() => {
    if (!ONLINE_GIFT || !CAMPAIGN.demo || publicOnly) return;
    const update = () => setLocal([...sessionOrnaments()]);
    update(); window.addEventListener(SESSION_TREE_EVENT, update);
    return () => window.removeEventListener(SESSION_TREE_EVENT, update);
  }, [publicOnly]);
  const poll = useResilientPoll(async (signal) => {
    if (!CAMPAIGN.sharedDemoData) {
      if (!CAMPAIGN.liveData) return { remote: [] as TreeOrnament[], mine: [] as MyOrnament[], count: 0 };
      const rows = await livePublicTree({ signal });
      return { remote: [...rows].reverse().map(o => ({ id: o.id, kind: o.kind as OrnamentKind, x: o.x, y: o.y, ...(o.dedica ? { dedica: o.dedica } : {}), ...(o.firma ? { firma: o.firma } : {}) })), mine: [] as MyOrnament[], count: rows.length };
    }
    if (publicOnly) {
      const summary = await publicTvTree({ signal });
      return { remote: [...summary.rows].reverse().map(o => ({ id:o.id,kind:o.kind as OrnamentKind,x:o.x,y:o.y,...(o.dedica ? {dedica:o.dedica} : {}),...(o.firma ? {firma:o.firma} : {}) })), mine: [] as MyOrnament[], count: summary.count };
    }
    const [t, m] = await Promise.all([
      campaignRpc('public_tree', undefined, signal),
      publicOnly ? Promise.resolve({ data: [] as MyOrnament[], error: null }) : campaignRpc('my_ornaments', { _client: clientId() }, signal),
    ]);
    if (t.error) throw new Error(t.error.message);
    return { remote: [...(t.data ?? [])].reverse().map(o => ({ id: o.id, kind: o.kind as OrnamentKind, x: o.x, y: o.y, ...(o.dedica ? { dedica: o.dedica } : {}), ...(o.firma ? { firma: o.firma } : {}) })), mine: m.data ?? [], count: t.data?.length ?? 0 };
  }, { remote: [] as TreeOrnament[], mine: [] as MyOrnament[], count: 0 }, POLL_MS);
  const sync = poll.refresh;
  useEffect(() => {
    const h = () => void sync();
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, [sync]);
  const { mine, count } = poll.data;
  const remote = poll.data.remote;
  const visible = ONLINE_GIFT && CAMPAIGN.demo && !publicOnly ? mergeSessionOrnaments(remote, local) : remote;
  return { mine, error: poll.error || poll.stale, loaded: poll.loaded, lastSuccess: poll.lastSuccess, addedOrnaments: visible, addedCount: Math.max(count, visible.length), publicOrnaments: CAMPAIGN.demo && !ONLINE_GIFT ? [...TREE_ORNAMENTS, ...remote] : visible, total: (CAMPAIGN.demo && !ONLINE_GIFT ? MOCK_TOTAL_GIFTS : 0) + Math.max(count, visible.length), refresh: sync };
}
