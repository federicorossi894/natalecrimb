import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, Pause, Play } from "lucide-react";
import { TreeTV, type TvBeat } from "@/components/xmas/TreeTV";

/**
 * Internal presentation page (not linked anywhere): the real casetta TV component, with buttons that jump
 * straight to each scene and a quick 35-second run. The public /albero-live stays autonomous, with no controls.
 */
export const Route = createFileRoute("/tv-preview")({
  head: () => ({
    meta: [
      { title: "Anteprima regia TV · DEMO – CRI Monza" },
      { name: "description", content: "Pagina interna per la presentazione: le scene reali dello schermo della casetta CRI in Piazza San Paolo, selezionabili subito." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Anteprima regia TV · DEMO" },
      { property: "og:description", content: "Le scene dello schermo della casetta CRI di Monza, per la presentazione." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TvPreviewPage,
});

const PREVIEW_SCENES: { beat: TvBeat; label: string; note: string }[] = [
  { beat: "invito", label: "Albero e QR", note: "Invito principale" },
  { beat: "passi", label: "Come partecipare", note: "3 passi" },
  { beat: "attivita", label: "Quattro regali", note: "Le cause CRI Monza" },
  { beat: "casetta", label: "Casetta ed eventi", note: "Solo eventi confermati" },
  { beat: "dedica", label: "Dedica pubblica", note: "Esempio DEMO se non ce ne sono" },
  { beat: "auguri", label: "Muro degli auguri", note: "Approvati + esempi DEMO" },
  { beat: "arrivo", label: "Nuova pallina", note: "Arrivo di un regalo" },
];
/** Quick run: 7 scenes × 5 s = 35 s. */
const QUICK_STEP_MS = 5000;

function TvPreviewPage() {
  const [beat, setBeat] = useState<TvBeat>("invito");
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const total = PREVIEW_SCENES.length * QUICK_STEP_MS;

  useEffect(() => {
    if (!playing) return;
    const t0 = performance.now();
    setBeat(PREVIEW_SCENES[0]!.beat);
    const id = setInterval(() => {
      const ms = performance.now() - t0;
      if (ms >= total) { setPlaying(false); setElapsed(0); setBeat("invito"); return; }
      setElapsed(ms);
      setBeat(PREVIEW_SCENES[Math.floor(ms / QUICK_STEP_MS)]!.beat);
    }, 200);
    return () => clearInterval(id);
  }, [playing, total]);

  const pick = (b: TvBeat) => { setPlaying(false); setElapsed(0); setBeat(b); };
  const fullscreen = useCallback(() => { void frame.current?.requestFullscreen?.().catch(() => {}); }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Pagina interna · non collegata al sito</p>
            <h1 className="font-display text-2xl leading-tight sm:text-3xl">Anteprima regia TV <span className="ml-1 rounded-full bg-primary px-2.5 py-0.5 align-middle font-sans text-xs font-bold tracking-wider text-primary-foreground">DEMO</span></h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setElapsed(0); setPlaying((p) => !p); }} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-deep">
              {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
              {playing ? "Ferma la demo" : "Riproduci demo rapida · 35 s"}
            </button>
            <button type="button" onClick={fullscreen} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold">
              <Expand className="h-4 w-4" aria-hidden /> Schermo intero
            </button>
          </div>
        </header>

        <div ref={frame} className="tv-preview-frame mt-4" data-testid="tv-preview-frame">
          <div className="tv-preview-inner">
            <TreeTV preview={{ beat }} />
            <span className="tv-preview-chip">Anteprima · DEMO</span>
          </div>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${playing ? (elapsed / total) * 100 : 0}%` }} />
        </div>

        <nav aria-label="Scene della TV" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {PREVIEW_SCENES.map((s, i) => (
            <button
              key={s.beat}
              type="button"
              onClick={() => pick(s.beat)}
              aria-pressed={beat === s.beat}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${beat === s.beat ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Scena {i + 1}</span>
              <span className="block font-display text-base leading-tight">{s.label}</span>
              <span className="block text-xs text-muted-foreground">{s.note}</span>
            </button>
          ))}
        </nav>

        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Sono le scene vere dello schermo di /albero-live, con l’albero, i regali e gli auguri condivisi. Sullo schermo della casetta scorrono da sole, senza pulsanti, in circa 60–75 secondi.
          Il riquadro del Calendario della Gentilezza in alto a sinistra è quello reale del giorno. L’apertura delle ore 10 non è inclusa qui. Donazioni simulate: nessun pagamento reale.
        </p>
      </div>
    </main>
  );
}
