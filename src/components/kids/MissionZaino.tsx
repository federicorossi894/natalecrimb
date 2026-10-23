import { useEffect, useRef, useState } from "react";
import { ArrowRight, Hand, Home, Snowflake } from "lucide-react";
import { NEEDED_ITEMS, PACK_ITEMS, isPackComplete, type PackItemId } from "@/lib/kids-academy";
import { Backpack, ItemIcon } from "./KidsArt";
import { Bubble, HelperLine, ListenButton, MissionTop, PrimaryButton, useChimes } from "./Kit";
import { MissionDone } from "./MissionDone";

const INTRO = "Domani nevica tanto! Con i grandi andrai a portare un saluto ai vicini anziani. Prepara lo zaino: mettici dentro solo quello che serve davvero.";
type Drag = { id: PackItemId; x: number; y: number; sx: number; sy: number; moved: boolean };
/** The dragged picture finishing its trip: into the bag (useful item) or back to its tile (wrong item / missed drop). */
type Flight = { id: PackItemId; x: number; y: number; tx: number; ty: number; into: boolean; go: boolean };
const FLIGHT_MS = 380;
export const DRAG_HINT = "Trascina gli oggetti utili dentro lo zaino!";
export const TAP_HINT = "Oppure: tocca l’oggetto e poi lo zaino.";

export function MissionZaino({ sound, setSound, onExit, onComplete, onDiploma }: { sound: boolean; setSound: (v: boolean) => void; onExit: () => void; onComplete: () => void; onDiploma: () => void }) {
  const [packed, setPacked] = useState<PackItemId[]>([]);
  const [home, setHome] = useState<PackItemId[]>([]);
  const [sel, setSel] = useState<PackItemId | null>(null);
  const [fb, setFb] = useState<{ tone: "kind" | "great"; text: string } | null>(null);
  const [bump, setBump] = useState(0);
  const [shake, setShake] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const tiles = useRef<Partial<Record<PackItemId, HTMLButtonElement | null>>>({});
  const [done, setDone] = useState(false);
  const bag = useRef<HTMLButtonElement>(null);
  const skipClick = useRef(false);
  const chime = useChimes(sound);
  const complete = isPackComplete(packed);
  useEffect(() => { if (done) { onComplete(); chime("tada"); } }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const drop = (id: PackItemId) => {
    const it = PACK_ITEMS.find((i) => i.id === id)!;
    setSel(null);
    if (it.needed) { setPacked((p) => (p.includes(id) ? p : [...p, id])); setBump((b) => b + 1); chime("ok"); setFb({ tone: "great", text: `${it.name}: sì! ${it.note}` }); }
    else { setHome((h) => (h.includes(id) ? h : [...h, id])); setShake((s) => s + 1); chime("soft"); setFb({ tone: "kind", text: it.note }); }
  };
  const used = (id: PackItemId) => packed.includes(id) || home.includes(id);

  const overBag = (x: number, y: number) => {
    const r = bag.current?.getBoundingClientRect();
    return !!r && x > r.left - 24 && x < r.right + 24 && y > r.top - 24 && y < r.bottom + 24;
  };
  /** Animate the picture to (tx,ty); `after` runs when it lands. Skipped with reduced motion. */
  const fly = (id: PackItemId, x: number, y: number, tx: number, ty: number, into: boolean, after: () => void) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { after(); return; }
    setFlight({ id, x, y, tx, ty, into, go: false });
    requestAnimationFrame(() => requestAnimationFrame(() => setFlight((f) => (f ? { ...f, go: true } : f))));
    window.setTimeout(() => { setFlight(null); after(); }, FLIGHT_MS);
  };
  const centerOf = (el: Element | null | undefined) => { const r = el?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 }; };

  const onDown = (e: React.PointerEvent, id: PackItemId) => {
    if (used(id) || flight || e.button > 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, moved: d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10 } : d));
    setOver(overBag(e.clientX, e.clientY));
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag;
    setDrag(null); setOver(false);
    if (!d || !d.moved) return; // a tap: handled by onClick (select)
    skipClick.current = true;
    window.setTimeout(() => { skipClick.current = false; }, 0); // some browsers send no click after a drag
    const it = PACK_ITEMS.find((i) => i.id === d.id)!;
    const home = centerOf(tiles.current[d.id]);
    if (overBag(e.clientX, e.clientY)) {
      if (it.needed) { const c = centerOf(bag.current); fly(d.id, e.clientX, e.clientY, c.x, c.y, true, () => drop(d.id)); }
      else { setShake((s) => s + 1); chime("soft"); fly(d.id, e.clientX, e.clientY, home.x, home.y, false, () => drop(d.id)); }
    } else {
      // Missed the bag: the picture simply goes back, no penalty.
      fly(d.id, e.clientX, e.clientY, home.x, home.y, false, () => setFb({ tone: "kind", text: "Quasi! Portalo fin dentro lo zaino, poi lascia andare il dito." }));
    }
  };
  const onItemClick = (id: PackItemId) => {
    if (skipClick.current) { skipClick.current = false; return; }
    if (used(id)) return;
    setSel((s) => (s === id ? null : id));
    setFb({ tone: "kind", text: "Ora tocca lo zaino per metterlo dentro." });
  };
  const onBag = () => {
    if (sel) drop(sel);
    else setFb({ tone: "kind", text: "Trascina un oggetto nello zaino, oppure toccalo e poi tocca lo zaino." });
  };
  const restart = () => { setPacked([]); setHome([]); setSel(null); setFb(null); setDone(false); };

  const top = <MissionTop n={2} title="Prepara lo zaino della missione" step={done ? 2 : complete ? 1 : 0} steps={2} sound={sound} setSound={setSound} onExit={onExit} />;
  if (done) return (
    <>{top}<MissionDone mission="zaino" title="Zaino pronto, aiutante!" onDiploma={onDiploma} onExit={onExit} onRetry={restart}
      lessons={["Quando nevica: vestiti a strati, con berretto, sciarpa, guanti e scarpe che non scivolano.", "Torcia e telefono carico servono a farsi vedere e a chiamare aiuto se serve.", "Prima di uscire si avvisa sempre un adulto, e si esce insieme a lui.", "Sul ghiaccio si cammina piano, restando dove gli altri ti vedono."]}
      extra={<div className="mx-auto mt-5 grid max-w-xl grid-cols-5 gap-2">{NEEDED_ITEMS.map((id) => <div key={id} className="rounded-2xl bg-card p-2"><ItemIcon id={id} className="mx-auto h-12 w-12" /></div>)}</div>} /></>
  );

  return (
    <>
      {top}
      <section className="mx-auto max-w-6xl select-none px-4 pt-4" data-testid="zaino-game">
        <div className="flex items-start gap-3 rounded-3xl border hairline-gold bg-card/70 p-4">
          <Snowflake className="mt-1 h-6 w-6 shrink-0 text-gold" />
          <div className="min-w-0 flex-1">
            <p className="text-lg leading-relaxed">{INTRO}</p>
            <div className="mt-2"><ListenButton text={INTRO} /></div>
          </div>
        </div>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="sticky top-16 z-20 sm:top-[72px] -mx-4 border-b border-border bg-background/95 px-4 pb-3 pt-1 backdrop-blur lg:order-2 lg:top-24 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <button ref={bag} type="button" onClick={onBag} aria-label={sel ? `Metti nello zaino: ${PACK_ITEMS.find((i) => i.id === sel)?.name}` : "Zaino della missione"}
              className={`relative mx-auto block w-full max-w-[118px] rounded-[2rem] p-1.5 transition duration-200 sm:max-w-[200px] lg:max-w-[320px] ${over ? "scale-110 bg-gold/30 ring-4 ring-gold" : sel || drag?.moved ? "bg-gold/15 ring-2 ring-gold" : ""}`} data-testid="backpack" data-over={over || undefined}>
              <div key={`${bump}-${shake}`} className={bump || shake ? (shake && fb?.tone === "kind" ? "kid-shake" : "kid-bump") : ""}><Backpack packed={packed} className="w-full" /></div>
            </button>
            {drag?.moved
              ? <p className="mt-1 text-center text-sm font-semibold text-gold lg:mt-2">{over ? "Lascia andare: dentro!" : "Portalo qui, nello zaino"}</p>
              : <p className="mt-1 text-center text-sm font-semibold lg:mt-2" aria-live="polite"><span className="text-gold">{packed.length}</span> di {NEEDED_ITEMS.length} oggetti utili nello zaino</p>}
            {/* Phones: the bag stays pinned with a short feedback line, so items can be dragged up to it while scrolling. */}
            {fb && <div role="status" aria-live="polite" className="mt-1 lg:hidden"><HelperLine tone={fb.tone}>{fb.text}</HelperLine></div>}
            {fb && <div className="mt-3 hidden lg:block"><Bubble tone={fb.tone}>{fb.text}</Bubble></div>}
            {complete && (
              <div className="mt-2 text-center lg:mt-3">
                <p className="hidden font-display text-2xl text-gold lg:block">Lo zaino è pronto!</p>
                <PrimaryButton onClick={() => { setDone(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-2">Partiamo! <ArrowRight className="h-5 w-5" /></PrimaryButton>
              </div>
            )}
          </div>
          <div className="lg:order-1">
            <div className="mb-3 flex items-center gap-3 rounded-3xl bg-secondary px-4 py-3" data-testid="drag-hint">
              <span aria-hidden className="kid-drag-hint flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-ink"><Hand className="h-6 w-6" /></span>
              <p className="leading-tight"><strong className="block font-display text-xl">{DRAG_HINT}</strong><span className="text-sm text-muted-foreground">{TAP_HINT}</span></p>
            </div>
            <ul className="grid grid-cols-3 gap-2.5 sm:gap-3" aria-label="Oggetti da scegliere">
              {PACK_ITEMS.map((it) => {
                const isHome = home.includes(it.id), isIn = packed.includes(it.id), isSel = sel === it.id, isDrag = drag?.id === it.id && drag.moved;
                return (
                  <li key={it.id}>
                    <button type="button" ref={(el) => { tiles.current[it.id] = el; }} onPointerDown={(e) => onDown(e, it.id)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { setDrag(null); setOver(false); }} onClick={() => onItemClick(it.id)}
                      aria-pressed={isSel} aria-disabled={isIn || isHome} aria-label={`${it.name}${isIn ? ", nello zaino" : isHome ? ", resta a casa" : ""}`}
                      style={{ touchAction: "none" }}
                      className={`relative flex w-full flex-col items-center rounded-3xl border p-2 pb-3 text-center transition select-none ${isSel ? "border-gold bg-secondary ring-2 ring-gold" : "glass"} ${isIn || isHome ? "opacity-35" : "active:scale-95"} ${isDrag ? "opacity-30" : ""}`}>
                      <ItemIcon id={it.id} className="h-16 w-16 sm:h-24 sm:w-24" />
                      <span className="text-xs font-semibold leading-tight sm:text-sm">{it.name}</span>
                      {isHome && <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-muted"><Home className="h-4 w-4" /></span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
      {/* The picture follows the finger / mouse while dragging. */}
      {drag?.moved && (
        <div className="pointer-events-none fixed z-50 h-24 w-24 -translate-x-1/2 -translate-y-1/2 drop-shadow-2xl" style={{ left: drag.x, top: drag.y }} aria-hidden data-testid="drag-ghost">
          <ItemIcon id={drag.id} className={`h-full w-full transition-transform ${over ? "scale-110 rotate-0" : "-rotate-6 scale-105"}`} />
        </div>
      )}
      {flight && (
        <div className="pointer-events-none fixed z-50 h-24 w-24 -translate-x-1/2 -translate-y-1/2 drop-shadow-2xl" aria-hidden data-testid="drag-flight"
          style={{ left: flight.go ? flight.tx : flight.x, top: flight.go ? flight.ty : flight.y, transform: `translate(-50%,-50%) scale(${flight.go ? (flight.into ? 0.25 : 0.7) : 1})`, opacity: flight.go && flight.into ? 0.2 : 1, transition: `left ${FLIGHT_MS}ms cubic-bezier(.3,.7,.2,1), top ${FLIGHT_MS}ms cubic-bezier(.3,.7,.2,1), transform ${FLIGHT_MS}ms ease, opacity ${FLIGHT_MS}ms ease` }}>
          <ItemIcon id={flight.id} className="h-full w-full" />
        </div>
      )}
    </>
  );
}
