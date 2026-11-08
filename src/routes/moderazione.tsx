import { CAMPAIGN } from "@/lib/campaign";
import { demoModeration } from "@/lib/campaign.functions";
import { liveDedicationModeration } from '@/lib/payments.functions';
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { EventsAdmin } from "@/components/xmas/EventsAdmin";
import { WishesAdmin } from "@/components/xmas/WishesAdmin";
import { KindnessAdmin } from "@/components/xmas/KindnessAdmin";
import { AuthBox } from "@/components/xmas/AuthBox";
import { EmailQa } from "@/components/xmas/EmailQa";
import type { OrnamentKind } from "@/lib/data";
import { SANTA_CONTRIBUTION_EUR, SANTA_CONTRIBUTION_NOTE, SANTA_REFERENCES } from "@/lib/santa";

export const Route = createFileRoute("/moderazione")({
  head: () => ({
    meta: [
      { title: CAMPAIGN.demo ? "Moderazione dediche (demo) – CRI Monza" : "Gestione calendario ed eventi – CRI Monza" },
      { name: "description", content: "Area riservata ai moderatori della campagna Il Natale che fa bene." },
      { property: "og:title", content: CAMPAIGN.demo ? "Moderazione dediche · demo" : "Gestione contenuti della campagna" },
      { property: "og:description", content: "Area riservata agli operatori autorizzati della campagna CRI Monza." },
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
    if (CAMPAIGN.liveData) { try { setRows(await liveDedicationModeration({ data: {} })); } catch { setRows([]); } return; }
    try { const data = await demoModeration({ data: { action: 'ornaments' } }); setRows(data.ornaments); } catch { setRows([]); }
  }, []);
  useEffect(() => { if (session) void load(); }, [session, load]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    if (CAMPAIGN.liveData) { await liveDedicationModeration({ data: { id, status } }); void load(); return; }
    if (!CAMPAIGN.sharedDemoData) return;
    await demoModeration({ data: { action: 'setOrnament', id, status } });
    void load();
  };

  return (
    <Shell hidePiazzaPill>
      <PageHead kicker={CAMPAIGN.demo ? "DEMO · Area riservata" : "Area riservata"} title={CAMPAIGN.wishModeration ? "Moderazione dediche, auguri ed eventi" : "Calendario ed eventi"} />
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
            {CAMPAIGN.wishModeration && <WishesAdmin />}
            <KindnessAdmin />
            <EventsAdmin />
            {CAMPAIGN.demo && <EmailQa />}
            {/* Internal benchmark for the Comitato: removed from the public Santa page, kept here for staff only. */}
            <div className="glass mt-8 rounded-2xl p-5 text-sm" data-testid="santa-internal-note">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gold">Nota interna · Babbo Natale</p>
              <p className="mt-2">Contributo proposto €{SANTA_CONTRIBUTION_EUR} a famiglia ({SANTA_CONTRIBUTION_NOTE}). Riferimenti di servizi analoghi: {SANTA_REFERENCES.map((r) => `${r.who} €${r.eur}`).join(", ")}.</p>
              <p className="mt-1 text-xs text-muted-foreground">Visibile solo ai moderatori, non sulla pagina pubblica.</p>
            </div>
          </>
        )}
      </section>
    </Shell>
  );
}
