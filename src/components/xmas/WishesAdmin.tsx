import { campaignRpc } from "@/lib/campaign-rpc";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MODERATION_FLAG_LABEL } from "@/lib/wishes";
import { cn } from "@/lib/utils";

type Row = { id: string; body: string; nickname: string | null; status: string; auto_flags: string[]; created_at: string };
const TABS = [
  { id: "pending", label: "Da leggere", statuses: ["pending"] },
  { id: "approved", label: "Pubblicati", statuses: ["approved"] },
  { id: "closed", label: "Rifiutati / nascosti", statuses: ["rejected", "hidden"] },
] as const;

/** Moderators only (RLS + is_moderator re-checked inside moderate_wish). Nothing is published without approval. */
export function WishesAdmin() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const t = TABS.find((x) => x.id === tab)!;
    const { data, error } = await supabase.from("wishes").select("id,body,nickname,status,auto_flags,created_at").in("status", [...t.statuses]).order("created_at", { ascending: tab === "pending" }).limit(200);
    if (error) { setMsg(error.message); return; }
    setRows(data ?? []);
  }, [tab]);
  useEffect(() => { void load(); }, [load]);
  const act = async (id: string, status: "approved" | "rejected" | "hidden") => {
    const { error } = await campaignRpc("moderate_wish", { _id: id, _status: status });
    setMsg(error ? error.message : "");
    void load();
  };
  return (
    <div className="mt-10" data-testid="wishes-admin">
      <h2 className="font-display text-2xl">Muro degli Auguri</h2>
      <p className="mt-1 text-sm text-muted-foreground">Ogni augurio resta invisibile finché non lo approvi. I segnali automatici sono solo un aiuto: decidi tu.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("rounded-full px-4 py-2 text-sm", tab === t.id ? "bg-secondary text-foreground" : "text-muted-foreground")}>{t.label}</button>
        ))}
      </div>
      {msg && <p role="alert" className="mt-3 text-sm text-gold">{msg}</p>}
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nessun augurio in questa lista.</p>}
        {rows.map((w) => (
          <div key={w.id} className="glass rounded-2xl p-4">
            <p className="wish-text text-xl leading-snug">“{w.body}”</p>
            <p className="mt-1 text-xs text-muted-foreground">— {w.nickname ?? "senza firma"} · {new Date(w.created_at).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            {w.auto_flags.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gold"><AlertTriangle className="h-3.5 w-3.5" />{w.auto_flags.map((f) => <span key={f} className="rounded-full border hairline-gold px-2 py-0.5">{MODERATION_FLAG_LABEL[f] ?? f}</span>)}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {w.status !== "approved" && <button onClick={() => act(w.id, "approved")} className="rounded-full bg-fir px-4 py-2 text-xs font-semibold text-snow">Approva</button>}
              {w.status === "pending" && <button onClick={() => act(w.id, "rejected")} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Rifiuta</button>}
              {w.status === "approved" && <button onClick={() => act(w.id, "hidden")} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Nascondi</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
