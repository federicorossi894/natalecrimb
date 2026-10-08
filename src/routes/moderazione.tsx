import { createFileRoute } from "@tanstack/react-router";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { moderate, resetDemo, useTreeStore } from "@/lib/tree-store";

export const Route = createFileRoute("/moderazione")({
  head: () => ({
    meta: [
      { title: "Moderazione dediche (demo) – CRI Monza" },
      { name: "description", content: "Simulazione della revisione delle dediche prima della pubblicazione sull'Albero di Monza." },
      { property: "og:title", content: "Moderazione dediche · demo" },
      { property: "og:description", content: "Come vengono verificate le dediche prima di comparire sull'albero." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Mod,
});

function Mod() {
  const { list } = useTreeStore();
  return (
    <Shell>
      <PageHead kicker="DEMO · Moderazione" title="Dediche da verificare" />
      <section className="mx-auto max-w-3xl px-4">
        <p className="glass rounded-2xl p-4 text-sm text-muted-foreground"><span className="font-semibold text-gold">DEMO</span> · Nella versione reale questa area sarà riservata ai volontari con accesso protetto. Qui è aperta solo per mostrare il flusso; i dati restano su questo dispositivo.</p>
        <div className="mt-6 space-y-3">
          {list.length === 0 && <p className="text-muted-foreground">Nessun addobbo inserito in questa demo.</p>}
          {list.map((o) => (
            <div key={o.id} className="glass flex items-center gap-4 rounded-2xl p-4">
              <OrnamentIcon kind={o.kind} className="w-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-display italic">{o.dedica ? `“${o.dedica}”` : "Senza dedica"}</p>
                <p className="text-xs text-muted-foreground">— {o.firma ?? "Anonimo"} · <span className="text-gold">{o.status}</span></p>
              </div>
              {o.dedica && (
                <div className="flex gap-2">
                  <button onClick={() => moderate(o.id, "approved")} className="rounded-full bg-fir px-3 py-2 text-xs font-semibold text-snow">Approva</button>
                  <button onClick={() => moderate(o.id, "rejected")} className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Rifiuta</button>
                </div>
              )}
            </div>
          ))}
        </div>
        {list.length > 0 && <button onClick={resetDemo} className="mt-6 text-xs text-muted-foreground underline">Azzera dati demo</button>}
      </section>
    </Shell>
  );
}
