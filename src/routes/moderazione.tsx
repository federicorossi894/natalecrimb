import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { EventsAdmin } from "@/components/xmas/EventsAdmin";
import { AuthBox } from "@/components/xmas/AuthBox";
import type { OrnamentKind } from "@/lib/data";

export const Route = createFileRoute("/moderazione")({
  head: () => ({
    meta: [
      { title: "Moderazione dediche (demo) – CRI Monza" },
      { name: "description", content: "Area riservata ai moderatori per approvare le dediche dell'Albero di Monza demo." },
      { property: "og:title", content: "Moderazione dediche · demo" },
      { property: "og:description", content: "Area riservata ai moderatori dell'Albero di Monza demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Mod,
});

type Row = { id: string; kind: string; firma: string | null; dedica: string | null; status: string; publish_consent: boolean; created_at: string };

function Mod() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isMod, setIsMod] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    const { data: m } = await supabase.rpc("is_moderator");
    setIsMod(!!m);
    if (!m) return;
    const { data } = await supabase.from("demo_ornaments").select("id,kind,firma,dedica,status,publish_consent,created_at").not("dedica", "is", null).order("created_at", { ascending: false }).limit(100);
    setRows(data ?? []);
  }, []);
  useEffect(() => { if (session) void load(); }, [session, load]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    await supabase.from("demo_ornaments").update({ status }).eq("id", id);
    void load();
  };

  return (
    <Shell>
      <PageHead kicker="DEMO · Area riservata" title="Moderazione dediche ed eventi" />
      <section className="mx-auto max-w-3xl px-4">
        {!ready ? null : !session ? <AuthBox title="Accesso moderatori" returnPath="/moderazione" roleName="moderatore" /> : !isMod ? (
          <div className="glass rounded-2xl p-5 text-sm">
            <p>Sei connesso come <b>{session.user.email}</b>, ma il tuo account non ha il ruolo di moderatore.</p>
            <p className="mt-2 text-muted-foreground">Chiedi a un amministratore di assegnarti il ruolo.</p>
            <button onClick={() => supabase.auth.signOut()} className="mt-3 text-xs underline">Esci</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Moderatore: {session.user.email}</span>
              <button onClick={() => supabase.auth.signOut()} className="underline">Esci</button>
            </div>
            <div className="mt-4 space-y-3">
              {rows.length === 0 && <p className="text-muted-foreground">Nessuna dedica da mostrare.</p>}
              {rows.map((o) => (
                <div key={o.id} className="glass flex items-center gap-4 rounded-2xl p-4">
                  <OrnamentIcon kind={o.kind as OrnamentKind} className="w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display italic">“{o.dedica}”</p>
                    <p className="text-xs text-muted-foreground">— {o.firma ?? "Anonimo"} · <span className="text-gold">{o.status}</span></p>
                  </div>
                  <div className="flex gap-2">
                    {o.status !== "approved" && <button onClick={() => setStatus(o.id, "approved")} className="rounded-full bg-fir px-3 py-2 text-xs font-semibold text-snow">Approva</button>}
                    {o.status !== "rejected" && <button onClick={() => setStatus(o.id, "rejected")} className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Rifiuta</button>}
                  </div>
                </div>
              ))}
            </div>
            <EventsAdmin />
          </>
        )}
      </section>
    </Shell>
  );
}
