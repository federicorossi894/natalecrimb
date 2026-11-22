import { seoHead, PUBLIC_SEO } from '@/lib/seo';
import { ONLINE_GIFT } from "@/lib/site-experience";
import { CAMPAIGN } from "@/lib/campaign";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { Modal } from "@/components/xmas/Modal";
import { AdventScene, type DoorState } from "@/components/xmas/AdventScene";
import { useReducedMotion } from "@/components/xmas/TreeExperience";
import {
  DOORS, calendarPhase, demoDoor, loadOpened, saveOpened, seasonYear, useKindnessCalendar, type Door,
} from "@/lib/kindness";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendario")({
  staticData: { sitemap: true },
  head: () => seoHead('/calendario', PUBLIC_SEO['/calendario'], { image: true }),
  component: Calendario,
});

/** Time the plaque takes to swing open before the message appears. */
const SWING_MS = 700;
type Shown = Door & { demo?: boolean };

function Calendario() {
  const { doors, status, now } = useKindnessCalendar();
  const reduced = useReducedMotion();
  const ready = status === "ready";
  const d = now();
  const phase = ready ? calendarPhase(d) : null;
  const season = seasonYear(d);
  const byDay = useMemo(() => new Map(doors.map((x) => [x.day, x])), [doors]);
  const unlocked = doors.filter((x) => x.message).map((x) => x.day);
  const realToday = phase === "open" ? Math.max(0, ...unlocked) : 0;

  // DEMO (before 1 December only): a simulated day, example texts, nothing saved.
  const [demoDay, setDemoDay] = useState<number | null>(null);
  const demo = CAMPAIGN.demo && phase === "preview" && demoDay !== null;
  const [opened, setOpened] = useState<number[]>([]);
  const [demoOpened, setDemoOpened] = useState<number[]>([]);
  const [opening, setOpening] = useState<number | null>(null);
  const [show, setShow] = useState<Shown | null>(null);
  const [hint, setHint] = useState("");
  // Start with the entire building visible; zoom is an explicit visitor action.
  const [zoomScale, setZoomScale] = useState(1);
  const scaleRef = useRef(1);
  const pinch = useRef<{distance:number;scale:number;focus:number}|null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { if (ready) setOpened(loadOpened(season)); }, [ready, season]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const today = demo ? demoDay! : realToday;
  const openedList = demo ? demoOpened : opened;
  const available = (day: number) => (demo ? day <= demoDay! : !!byDay.get(day)?.message);
  const stateOf = (day: number): DoorState => {
    if (!ready) return "available";
    if (openedList.includes(day)) return "opened";
    if (!available(day)) return "locked";
    return day === today ? "today" : "available";
  };
  const labelOf = (day: number, s: DoorState) =>
    s === "opened" ? `Finestrella ${day}, già aperta: rileggi il gesto` :
    s === "locked" ? `Finestrella ${day}, chiusa: si apre il ${day} dicembre` :
    s === "today" ? `Finestrella ${day}, quella di oggi: aprila` : `Finestrella ${day}, disponibile: aprila`;

  const changeScale = (value:number) => {
    const next = Math.min(3.5,Math.max(1,value));
    scaleRef.current=next;
    setZoomScale(next);
  };
  // Native non-passive two-finger handling zooms the illustration (not the whole page).
  // Single-finger gestures remain native scroll/pan; plaque clicks still open their doors.
  useEffect(() => {
    const el=scroller.current;
    if(!el)return;
    const distance=(touches:TouchList)=>Math.hypot(
      touches[0]!.clientX-touches[1]!.clientX,
      touches[0]!.clientY-touches[1]!.clientY,
    );
    const start=(event:TouchEvent)=>{
      if(event.touches.length!==2)return;
      const rect=el.getBoundingClientRect();
      const midX=(event.touches[0]!.clientX+event.touches[1]!.clientX)/2-rect.left;
      pinch.current={
        distance:Math.max(distance(event.touches),1),
        scale:scaleRef.current,
        focus:(el.scrollLeft+midX)/Math.max(el.scrollWidth,1),
      };
    };
    const move=(event:TouchEvent)=>{
      if(event.touches.length!==2||!pinch.current)return;
      event.preventDefault();
      const p=pinch.current;
      const next=Math.min(3.5,Math.max(1,p.scale*distance(event.touches)/p.distance));
      scaleRef.current=next;
      setZoomScale(next);
      const rect=el.getBoundingClientRect();
      const midX=(event.touches[0]!.clientX+event.touches[1]!.clientX)/2-rect.left;
      requestAnimationFrame(()=>{el.scrollLeft=p.focus*el.scrollWidth-midX;});
    };
    const end=(event:TouchEvent)=>{
      if(event.touches.length<2)pinch.current=null;
    };
    el.addEventListener('touchstart',start,{passive:true});
    el.addEventListener('touchmove',move,{passive:false});
    el.addEventListener('touchend',end);
    el.addEventListener('touchcancel',end);
    return ()=>{
      el.removeEventListener('touchstart',start);
      el.removeEventListener('touchmove',move);
      el.removeEventListener('touchend',end);
      el.removeEventListener('touchcancel',end);
    };
  },[]);
  const toggleZoom=()=>{
    const next=zoomScale>1.01?1:2.5;
    changeScale(next);
    const el=scroller.current;
    if(el)requestAnimationFrame(()=>{
      el.scrollLeft=next===1?0:(el.scrollWidth-el.clientWidth)/2;
      if(next===1)el.scrollTop=0;
    });
  };

  const openDoor = (day: number) => {
    if (!ready || opening !== null) return;
    if (!available(day)) {
      setHint(demo ? `In questa DEMO la finestrella ${day} è ancora chiusa: si aprirebbe il ${day} dicembre.` : `La finestrella ${day} si apre il ${day} dicembre. Pazienza: la sorpresa è dietro la porta!`);
      return;
    }
    setHint("");
    const door: Shown = demo ? { ...demoDoor(day), demo: true } : byDay.get(day)!;
    const already = openedList.includes(day);
    if (!already) {
      if (demo) setDemoOpened((l) => [...l, day]);
      else { const next = [...opened, day]; setOpened(next); saveOpened(season, next); }
    }
    if (already || reduced) { setShow(door); return; }
    setOpening(day);
    timer.current = setTimeout(() => { setOpening(null); setShow(door); }, SWING_MS);
  };

  return (
    <Shell>
      <PageHead kicker="Il nostro Calendario dell’Avvento" title={<>Calendario della Gentilezza: <em className="text-gold">24 finestrelle, 24 gesti.</em></>}>
        Questo è il nostro <strong>Calendario dell’Avvento</strong>, e si chiama <strong>Calendario della Gentilezza</strong>: dal 1° al 24 dicembre apri ogni giorno una nuova casellina sulla sede natalizia della Croce Rossa di Monza e scopri un piccolo gesto gentile da fare a Monza, a casa o a scuola. Tocca una finestrella per aprirla; ingrandisci la sede se vuoi esplorarla da vicino.
      </PageHead>

      <section className="mx-auto max-w-6xl px-4">
        {phase === "preview" && (
          <div className="glass mb-5 flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between" data-testid="calendar-preview">
            <p className="text-sm"><b className="font-display text-lg">Il calendario si apre il 1° dicembre.</b><br /><span className="text-muted-foreground">Le finestrelle seguono la data italiana: si aprono a mezzanotte, ora di Roma, qualunque sia l'orologio del tuo telefono.</span></p>
            {!CAMPAIGN.demo ? null : demoDay === null ? (
              <button type="button" onClick={() => { setDemoDay(12); setHint(""); }} className="shrink-0 rounded-full border hairline-gold px-5 py-3 text-sm font-semibold text-gold" data-testid="calendar-demo-on">Prova il calendario · DEMO</button>
            ) : (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  Giorno simulato
                  <select value={demoDay} onChange={(e) => { setDemoDay(Number(e.target.value)); setHint(""); }} className="rounded-full border border-border bg-background px-3 py-2 text-sm" data-testid="calendar-demo-day">
                    {Array.from({ length: DOORS }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} dicembre</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => { setDemoDay(null); setDemoOpened([]); setHint(""); }} className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline">Esci dalla DEMO</button>
              </div>
            )}
          </div>
        )}
        {phase === "closed" && (
          <div className="glass mb-5 rounded-3xl p-5 text-sm" data-testid="calendar-closed">
            <b className="font-display text-lg">Grazie per 24 giorni di gentilezza.</b>
            <p className="text-muted-foreground">Il calendario si è chiuso con la Vigilia: tutte le finestrelle restano aperte, da rileggere quando vuoi.</p>
          </div>
        )}

        <div className="advent-frame" data-testid="advent">
          <div ref={scroller} className={cn("advent-scroll",zoomScale>1.01&&"is-zoomed")} data-zoom={zoomScale>1.01?"zoomed":"fit"}>
            <div className="advent-scaled" style={{width:`${zoomScale*100}%`}}>
              <AdventScene state={stateOf} label={labelOf} onSelect={openDoor} opening={opening} />
            </div>
          </div>
          {demo && <span className="advent-demo-chip">DEMO · {demoDay} dicembre simulato</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">La sede è mostrata per intero. Puoi ingrandire con due dita oppure con il pulsante.</p>
          <button type="button" onClick={toggleZoom} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold" data-testid="advent-zoom" aria-pressed={zoomScale>1.01}>
            {zoomScale>1.01?<><Minimize2 className="h-3.5 w-3.5" aria-hidden />Vedi tutta la sede</>:<><Maximize2 className="h-3.5 w-3.5" aria-hidden />Ingrandisci la sede</>}
          </button>
        </div>
        {zoomScale>1.01 && <p className="mt-2 text-xs text-muted-foreground">Trascina la sede per esplorare le finestrelle; avvicina o allontana due dita per regolare l’ingrandimento.</p>}
        <p className="mt-3 min-h-5 text-center text-sm text-gold" role="status">{hint || (today ? `${demo ? "DEMO · " : "Oggi è il "}${today} dicembre: la finestrella ${today} ti aspetta.` : "")}</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Una al giorno", d: "Dal 1 al 24 dicembre. Le finestrelle dei giorni passati restano aperte, quelle future si aprono solo quando arriva il loro giorno." },
            { t: "Gesti semplici e sicuri", d: "Piccole attenzioni per chi ci sta intorno. Se qualcuno è in difficoltà e la situazione sembra seria, la cosa giusta è chiamare il 112." },
            ...(ONLINE_GIFT ? [{ t: "Dove sei tu", d: "Un piccolo gesto gentile da fare a casa, a scuola o con chi ami." }] : [{ t: "Anche in piazza", d: "Ogni giorno a mezzogiorno la finestrella del giorno si apre anche sullo schermo della casetta in Piazza San Paolo." }]),
          ].map((x) => (
            <div key={x.t} className="glass rounded-3xl p-5"><p className="font-display text-xl">{x.t}</p><p className="mt-2 text-sm text-muted-foreground">{x.d}</p></div>
          ))}
        </div>
        {!ONLINE_GIFT && <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auguri" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Guarda il Muro degli auguri</Link>
          <Link to="/casetta" className="glass rounded-full px-5 py-3 text-sm font-semibold">Vieni alla casetta</Link>
        </div>}
      </section>

      <Modal open={!!show} onClose={() => setShow(null)} panelClassName="advent-note">
        {show && (
          <div className="advent-reveal pt-4 text-center" data-testid="door-message">
            {show.demo && <span className="inline-block rounded-full border border-burgundy/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-burgundy">Esempio · DEMO</span>}
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-burgundy">{show.day} dicembre · Gesto del giorno</p>
            <p className="mt-3 font-display text-3xl">{show.title}</p>
            <p className="mt-3 text-lg leading-relaxed">{show.message}</p>
            <p className="advent-note-foot mt-6 text-xs">Calendario della Gentilezza · Il Natale che fa bene</p>
          </div>
        )}
      </Modal>
    </Shell>
  );
}
