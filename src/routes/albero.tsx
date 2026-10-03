import { createFileRoute, Link } from "@tanstack/react-router";
import { Maximize2, Tv } from "lucide-react";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { TreeTV } from "@/components/xmas/TreeTV";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { TREE_ORNAMENTS } from "@/lib/data";

export const Route = createFileRoute("/albero")({
  head: () => ({
    meta: [
      { title: "L'Albero dei Regali di Monza – CRI Monza" },
      { name: "description", content: "Ogni regalo diventa un addobbo. Anteprima della modalità TV proiettata in Piazza San Paolo." },
      { property: "og:title", content: "L'Albero dei Regali di Monza" },
      { property: "og:description", content: "Anteprima demo dell'albero proiettato alla casetta CRI di Piazza San Paolo." },
    ],
  }),
  component: Albero,
});

function Albero() {
  return (
    <Shell>
      <PageHead kicker="L'Albero di Monza" title={<>Ogni regalo<br /><span className="text-gold">accende l'albero.</span></>} />
      <section className="mx-auto max-w-6xl px-4">
        <div className="glass flex items-start gap-3 rounded-2xl border-gold/40 p-4">
          <Tv className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div>
            <p className="font-semibold"><span className="text-gold">DEMO</span> · Questa è l'anteprima della modalità TV che verrà proiettata in Piazza San Paolo.</p>
            <p className="mt-1 text-sm text-muted-foreground">Nella versione definitiva del sito, da smartphone potrai ruotare l'albero, esplorare gli addobbi e leggere le dediche.</p>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-3xl border shadow-deep">
          <TreeTV />
        </div>
        <Link to="/albero-live" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
          <Maximize2 className="h-4 w-4" /> Apri modalità TV
        </Link>

        <h2 className="mt-16 font-display text-3xl">Cosa si appende all'albero</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([["dae", "Piccolo DAE", "Regala un battito"], ["calore", "Sciarpa", "Regala calore"], ["prossimita", "Unità mobile", "Regala prossimità"], ["cuore", "Cuore CRI", "Dove serve di più"]] as const).map(([k, n, d]) => (
            <div key={k} className="glass rounded-2xl p-4 text-center">
              <OrnamentIcon kind={k} className="mx-auto w-14" />
              <p className="mt-2 font-display text-lg">{n}</p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-16 font-display text-3xl">Alcune dediche <span className="text-sm text-muted-foreground">(esempi demo)</span></h2>
        <div className="mt-6 columns-1 gap-3 sm:columns-2 lg:columns-3">
          {TREE_ORNAMENTS.filter((o) => o.dedica).map((o) => (
            <div key={o.id} className="mb-3 break-inside-avoid rounded-2xl bg-paper p-5 text-ink">
              <OrnamentIcon kind={o.kind} className="w-8" />
              <p className="mt-3 font-display text-lg italic leading-snug">“{o.dedica}”</p>
              <p className="mt-2 text-sm font-semibold text-primary">— {o.firma ?? "Anonimo"}</p>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
