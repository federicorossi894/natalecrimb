import { CAMPAIGN } from "@/lib/campaign";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, Pause, Play, RotateCcw } from "lucide-react";
import { TreeTV, type TvBeat } from "@/components/xmas/TreeTV";
import { TreeGrowthLab } from "@/components/xmas/TreeGrowthLab";
import { useReducedMotion } from "@/components/xmas/TreeExperience";
import { ceremonyLength, ceremonySteps, type CeremonyPhase } from "@/components/xmas/AdventCeremony";
import { DOORS } from "@/lib/kindness";

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
  validateSearch: (s: Record<string, unknown>): { modo?: Modo } => {
    const m = s["modo"];
    return m === "crescita" || m === "calendario" ? { modo: m } : {};
  },
  component: TvPreviewPage,
});

type Modo = "crescita" | "calendario";
type SceneId = TvBeat | "calendario";

const ALL_PREVIEW_SCENES: { id: SceneId; label: string; note: string }[] = [
  { id: "invito", label: "Albero e QR", note: "Invito principale" },
  { id: "passi", label: "Come partecipare", note: "3 passi" },
  { id: "attivita", label: "Quattro regali", note: "Le cause CRI Monza" },
  { id: "casetta", label: "Casetta ed eventi", note: "Solo eventi confermati" },
  { id: "dedica", label: "Dedica pubblica", note: "Esempio DEMO se non ce ne sono" },
  { id: "auguri", label: "Muro degli auguri", note: "Approvati + esempi DEMO" },
  { id: "calendario", label: "Calendario della Gentilezza", note: "Apertura delle 12:00" },
  { id: "arrivo", label: "Nuova pallina", note: "Arrivo di un regalo" },
];
const PREVIEW_SCENES = ALL_PREVIEW_SCENES.filter(s => s.id !== "auguri" || CAMPAIGN.publicWishWall);
/** Quick run: each scene 4.5 s; the calendar gets a condensed version of its 12:00 opening (see quickCeremony). */
const QUICK_STEP_MS = 4500;
const QUICK_HOLD_MS = 4300;

/**
 * The 12:00 opening condensed for the quick run, at real speed: from just before the camera move to the message,
 * a few seconds of reading, then its own fade-out back to the loop. Returns the segment length and a mapping from
 * segment time to ceremony time.
 */
function quickCeremony(reduced: boolean) {
  const steps = ceremonySteps(reduced);
  const total = ceremonyLength(reduced);
  const msgAt = steps.find((s) => s.id === "message")!.at;
  const outAt = steps.find((s) => s.id === "out")!.at;
  const start = Math.max(0, msgAt - 5600);
  const toHold = msgAt - start + QUICK_HOLD_MS;
  return {
    length: toHold + (total - outAt),
    at: (t: number) => (t < toHold ? start + t : outAt + (t - toHold)),
  };
}

/** Local ceremony clock for the preview: play, pause and seek, no wall clock, no storage. */
function useCeremonyClock(total: number, initial: number) {
  const [elapsed, setElapsed] = useState(initial);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = setInterval(() => {
      const t = performance.now();
      const dt = t - last;
      last = t;
      setElapsed((e) => {
        const n = e + dt;
        if (n >= total) { setPlaying(false); return total; }
        return n;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, total]);
  return {
    elapsed, playing, done: elapsed >= total,
    play: () => { setElapsed(0); setPlaying(true); },
    toggle: () => setPlaying((p) => !p),
    seek: (ms: number) => { setPlaying(false); setElapsed(ms); },
  };
}

function TvPreviewPage() {
  const { modo } = Route.useSearch();
  const navigate = Route.useNavigate();
  const growth = modo === "crescita";
  const calendar = modo === "calendario";
  const reduced = useReducedMotion();
  const [scene, setScene] = useState<SceneId>("invito");
  const [quick, setQuick] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [calDay, setCalDay] = useState(1);
  const frame = useRef<HTMLDivElement>(null);
  const calTotal = ceremonyLength(reduced);
  const cal = useCeremonyClock(calTotal, calTotal);
  const condensed = quickCeremony(reduced);
  const segments = (() => {
    let start = 0;
    return PREVIEW_SCENES.map((s) => {
      const len = s.id === "calendario" ? condensed.length : QUICK_STEP_MS;
      const seg = { id: s.id, start, len };
      start += len;
      return seg;
    });
  })();
  const total = segments[segments.length - 1]!.start + segments[segments.length - 1]!.len;

  useEffect(() => {
    if (!quick) return;
    const t0 = performance.now();
    const id = setInterval(() => {
      const ms = performance.now() - t0;
      if (ms >= total) { setQuick(false); setElapsed(0); setScene("invito"); return; }
      setElapsed(ms);
    }, 100);
    return () => clearInterval(id);
  }, [quick, total]);

  const seg = quick ? (segments.find((s) => elapsed < s.start + s.len) ?? segments[0]!) : null;
  const shown: SceneId = seg ? seg.id : scene;
  const tv = seg
    ? seg.id === "calendario"
      ? { beat: "invito" as TvBeat, advent: { day: calDay, elapsed: condensed.at(elapsed - seg.start) } }
      : { beat: seg.id }
    : scene === "calendario"
      ? { beat: "invito" as TvBeat, advent: cal.done ? null : { day: calDay, elapsed: cal.elapsed } }
      : { beat: scene };
  const calPhase = ceremonySteps(reduced).reduce<CeremonyPhase>((p, s) => (cal.elapsed >= s.at ? s.id : p), "dark");

  const pick = (s: SceneId) => {
    setQuick(false); setElapsed(0); setScene(s);
    if (s === "calendario") cal.play(); else cal.seek(calTotal);
  };
  const fullscreen = useCallback(() => { void frame.current?.requestFullscreen?.().catch(() => {}); }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Pagina interna · non collegata al sito</p>
            <h1 className="font-display text-2xl leading-tight sm:text-3xl">Anteprima regia TV <span className="ml-1 rounded-full bg-primary px-2.5 py-0.5 align-middle font-sans text-xs font-bold tracking-wider text-primary-foreground">DEMO</span></h1>
          </div>
          {!modo && <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setElapsed(0); cal.seek(calTotal); setQuick((p) => !p); }} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-deep" data-testid="quick-run">
              {quick ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
              {quick ? "Ferma la demo" : `Riproduci demo rapida · ${Math.round(total / 1000)} s`}
            </button>
            <button type="button" onClick={fullscreen} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold">
              <Expand className="h-4 w-4" aria-hidden /> Schermo intero
            </button>
          </div>}
        </header>

        <div role="tablist" aria-label="Modalità anteprima" className="mt-4 inline-flex flex-wrap rounded-3xl bg-muted p-1">
          {([[undefined, "Scene TV"], ["crescita", "Crescita albero"], ["calendario", "Calendario della Gentilezza · regia"]] as const).map(([m, label]) => (
            <button key={label} type="button" role="tab" aria-selected={modo === m}
              onClick={() => { setQuick(false); setElapsed(0); cal.seek(calTotal); void navigate({ search: m ? { modo: m } : {}, replace: true }); }}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 ${modo === m ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        {growth ? <TreeGrowthLab /> : calendar ? <AdventPreviewLab onBack={() => void navigate({ search: {}, replace: true })} /> : <>

        <div ref={frame} className="tv-preview-frame mt-4" data-testid="tv-preview-frame">
          <div className="tv-preview-inner">
            <TreeTV preview={tv} />
            <span className="tv-preview-chip">Anteprima · DEMO</span>
          </div>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${quick ? (elapsed / total) * 100 : 0}%` }} />
        </div>

        {!quick && scene === "calendario" && (
          <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="scene-calendar-controls">
            <button type="button" onClick={cal.play} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" data-testid="scene-advent-play">
              {cal.done ? <RotateCcw className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />} Simula apertura delle 12:00
            </button>
            {!cal.done && (
              <button type="button" onClick={cal.toggle} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold" data-testid="scene-advent-pause">
                {cal.playing ? <><Pause className="h-4 w-4" aria-hidden /> Ferma qui</> : <><Play className="h-4 w-4" aria-hidden /> Riprendi</>}
              </button>
            )}
            <label className="flex items-center gap-2 text-sm font-semibold">
              Giorno
              <select value={calDay} onChange={(e) => { setCalDay(Number(e.target.value)); cal.play(); }} className="rounded-full border border-border bg-background px-3 py-2 text-sm" data-testid="scene-advent-day">
                {Array.from({ length: DOORS }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d} dicembre</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void navigate({ search: { modo: "calendario" }, replace: true })} className="rounded-full px-3 py-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">Regia completa: fasi e fermo immagine →</button>
            <p className="w-full text-sm" role="status" data-testid="scene-advent-status">
              {cal.done ? "Scena finita: la TV è tornata da sola al ciclo normale." : `${cal.playing ? "In riproduzione" : "In pausa"} · ${PHASE_LABEL[calPhase] ?? "Avvio"} · ${Math.round(cal.elapsed / 1000)} / ${Math.round(calTotal / 1000)} s`}
            </p>
          </div>
        )}

        <nav aria-label="Scene della TV" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {PREVIEW_SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s.id)}
              aria-pressed={shown === s.id}
              data-testid={`scene-${s.id}`}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${shown === s.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Scena {i + 1}</span>
              <span className="block font-display text-base leading-tight">{s.label}</span>
              <span className="block text-xs text-muted-foreground">{s.note}</span>
            </button>
          ))}
        </nav>

        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Sono le scene vere dello schermo di /albero-live, con l’albero, i regali e gli auguri condivisi. Sullo schermo della casetta scorrono da sole, senza pulsanti, in circa 60–75 secondi.
          Il Calendario della Gentilezza si apre da solo sulla TV ogni giorno dal 1° al 24 dicembre alle 12:00 (ora di Roma); qui si simula subito, per qualsiasi giorno, senza salvare nulla. Nella demo rapida l’apertura è condensata. Donazioni simulate: nessun pagamento reale.
        </p>
        </>}
      </div>
    </main>
  );
}

const PHASE_LABEL: Partial<Record<CeremonyPhase, string>> = { lit: "La sede si illumina", focus: "La casella del giorno", open: "L’apertura", message: "Il messaggio" };

/**
 * Calendar mode: the real TV component with the real 12:00 scene, for any day 1–24. Driven only by local state:
 * no clock, no storage, no writes. The day's text is the real one when its door is already public, otherwise a
 * labelled DEMO example (the server never sends future texts).
 */
function AdventPreviewLab({ onBack }: { onBack: () => void }) {
  const reduced = useReducedMotion();
  const steps = ceremonySteps(reduced);
  const total = ceremonyLength(reduced);
  const stillAt = (id: CeremonyPhase) => {
    const i = steps.findIndex((s) => s.id === id);
    const next = steps[i + 1]?.at ?? total;
    return Math.min(next - 200, steps[i]!.at + 2600);
  };
  const [day, setDay] = useState(1);
  const clock = useCeremonyClock(total, stillAt("lit"));
  const { elapsed, playing, done } = clock;
  const frame = useRef<HTMLDivElement>(null);
  const phase = steps.reduce<CeremonyPhase>((p, s) => (elapsed >= s.at ? s.id : p), "dark");

  const play = clock.play;
  const jump = (id: CeremonyPhase) => clock.seek(stillAt(id));
  const pickDay = (d: number) => { setDay(d); clock.seek(stillAt("lit")); };
  const fullscreen = () => { void frame.current?.requestFullscreen?.().catch(() => {}); };

  return (
    <div data-testid="advent-preview">
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={play} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-deep" data-testid="advent-play">
          <Play className="h-4 w-4" aria-hidden /> Simula apertura delle 12:00
        </button>
        {!done && (
          <button type="button" onClick={clock.toggle} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold" data-testid="advent-pause">
            {playing ? <><Pause className="h-4 w-4" aria-hidden /> Ferma qui</> : <><Play className="h-4 w-4" aria-hidden /> Riprendi</>}
          </button>
        )}
        {done && (
          <button type="button" onClick={() => jump("lit")} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold">
            <RotateCcw className="h-4 w-4" aria-hidden /> Torna alla sede
          </button>
        )}
        <button type="button" onClick={fullscreen} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold">
          <Expand className="h-4 w-4" aria-hidden /> Schermo intero
        </button>
        <button type="button" onClick={onBack} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline">Torna alle scene TV</button>
      </div>

      <div ref={frame} className="tv-preview-frame mt-4" data-testid="tv-preview-frame">
        <div className="tv-preview-inner">
          <TreeTV preview={{ beat: "invito", advent: done ? null : { day, elapsed } }} />
          <span className="tv-preview-chip">Simulazione · DEMO</span>
        </div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full bg-primary" style={{ width: `${(Math.min(elapsed, total) / total) * 100}%` }} />
      </div>
      <p className="mt-2 text-sm" role="status" data-testid="advent-status">
        {done ? "Scena finita: la TV è tornata da sola al ciclo normale." : `${playing ? "In riproduzione" : "In pausa"} · ${PHASE_LABEL[phase] ?? "Avvio"} · ${Math.round(Math.min(elapsed, total) / 1000)} / ${Math.round(total / 1000)} s`}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Ferma su una fase">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ferma su:</span>
        {steps.filter((s) => PHASE_LABEL[s.id]).map((s, i) => (
          <button key={s.id} type="button" onClick={() => jump(s.id)} aria-pressed={!done && !playing && phase === s.id}
            className={`rounded-xl border px-3 py-2 text-left text-sm transition ${!done && phase === s.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fase {i + 1}</span> <span className="font-display">{PHASE_LABEL[s.id]}</span>
          </button>
        ))}
      </div>

      <fieldset className="mt-4">
        <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Giorno di dicembre</legend>
        <div className="mt-2 grid grid-cols-8 gap-1.5 sm:grid-cols-12">
          {Array.from({ length: DOORS }, (_, i) => i + 1).map((d) => (
            <button key={d} type="button" onClick={() => pickDay(d)} aria-pressed={day === d} aria-label={`${d} dicembre`} data-testid={`advent-day-${d}`}
              className={`rounded-lg border py-2 text-sm font-semibold tabular-nums transition ${day === d ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>
              {d}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        È la scena vera che /albero-live mostra da sola ogni giorno dal 1° al 24 dicembre alle 12:00 (ora di Roma), una volta sola: se la TV si accende dopo mezzogiorno il gesto del giorno resta nel riquadro in alto a sinistra.
        Qui la simulazione non legge l’orologio e non salva nulla. Il testo è quello reale se la finestrella è già aperta al pubblico; altrimenti compare un esempio marcato DEMO.
        {reduced && " Il dispositivo chiede animazioni ridotte: la scena usa solo dissolvenze, senza movimento di camera."}
      </p>
    </div>
  );
}
