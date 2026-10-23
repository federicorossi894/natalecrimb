import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { useTreeStore } from '@/lib/tree-store';
import { useCasettaEvents, formatEventWhen } from '@/lib/events';
import { PROJECTS, type TreeOrnament } from '@/lib/data';
import { CASETTA } from '@/lib/casetta';
import { CasettaPoster } from './CasettaMedia';
import { TvQr } from './Qr';
import { CriLockup, OrnamentIcon } from './Ornament';
import { useReducedMotion } from './TreeExperience';
import { TreeStage } from './TreeStage';
import { TvKindness } from './TvKindness';
import { usePublicWishes, noteLook, type PublicWish } from '@/lib/wishes';

/** Silent director: every scene keeps the tree, the QR and the CRI signature on screen. */
export type TvScene = 'invito' | 'passi' | 'attivita' | 'casetta' | 'dedica' | 'auguri';
export const TV_DURATION: Record<TvScene, number> = { invito: 18000, passi: 14000, attivita: 14000, casetta: 14000, dedica: 12000, auguri: 14000 };
/** Dedication and wishes scenes exist only when at least one approved, public item exists. */
export const tvSequence = (hasPublicDedication: boolean, hasApprovedWishes = false): TvScene[] => [
  'invito', 'passi', 'attivita', 'casetta',
  ...(hasPublicDedication ? (['dedica'] as const) : []),
  ...(hasApprovedWishes ? (['auguri'] as const) : []),
];
const ARRIVAL_MS = 10000;
const SAFETY_RELOAD_MS = 6 * 60 * 60 * 1000;
type WakeNavigator = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };

const projectOf = (o: TreeOrnament) => PROJECTS.find((p) => p.ornament === o.kind);

/** Autonomous, silent 24/7 casetta screen: big tree on the left, warm invitation + large QR on the right. */
export function TreeTV() {
  const { addedOrnaments: ornaments, addedCount, error } = useTreeStore();
  const events = useCasettaEvents();
  const { wishes } = usePublicWishes(60_000);
  const wishesRef = useRef<PublicWish[]>(wishes);
  const wishCursor = useRef(0);
  const [wishTrio, setWishTrio] = useState<PublicWish[]>([]);
  const [scene, setScene] = useState<TvScene>('invito');
  const [selected, setSelected] = useState<TreeOrnament | null>(null);
  const [arriving, setArriving] = useState<TreeOrnament | null>(null);
  const previous = useRef<Set<string | number> | null>(null);
  const ornamentsRef = useRef(ornaments);
  const arrivingRef = useRef(arriving);
  const step = useRef(0);
  const cursor = useRef(0);
  const reduced = useReducedMotion();
  const publicDedications = useMemo(() => ornaments.filter((o) => o.dedica), [ornaments]);
  const hasDedications = publicDedications.length > 0;
  const sequence = tvSequence(hasDedications, wishes.length > 0);

  useEffect(() => { ornamentsRef.current = ornaments; }, [ornaments]);
  useEffect(() => { arrivingRef.current = arriving; }, [arriving]);
  useEffect(() => { wishesRef.current = wishes; }, [wishes]);

  // New gift detection (polling via useTreeStore). The first non-empty load is the existing tree, not an arrival.
  useEffect(() => {
    const ids = new Set(ornaments.map((o) => o.id));
    const prev = previous.current;
    if (prev && !(prev.size === 0 && ornaments.length > 1)) {
      const next = ornaments.find((o) => !prev.has(o.id));
      if (next) { setArriving(next); setSelected(next); }
    }
    previous.current = ids;
  }, [ornaments]);
  useEffect(() => {
    if (!arriving) return;
    const t = setTimeout(() => { setArriving(null); setSelected(null); }, ARRIVAL_MS);
    return () => clearTimeout(t);
  }, [arriving]);

  // Scene loop (≈60 s, ≈72 s with dedications), paused during an arrival.
  useEffect(() => {
    if (arriving) return;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      const pub = ornamentsRef.current.filter((o) => o.dedica);
      const w = wishesRef.current;
      const seq = tvSequence(pub.length > 0, w.length > 0);
      const s = seq[step.current % seq.length]!;
      step.current++;
      if (s === 'dedica') setSelected(pub[cursor.current++ % pub.length] ?? null);
      else setSelected(null);
      if (s === 'auguri') {
        const start = wishCursor.current;
        setWishTrio(Array.from({ length: Math.min(3, w.length) }, (_, i) => w[(start + i) % w.length]!));
        wishCursor.current = (start + 3) % Math.max(1, w.length);
      }
      setScene(s);
      timer = setTimeout(run, TV_DURATION[s]);
    };
    run();
    return () => clearTimeout(timer);
  }, [arriving]);

  // Unattended screen: keep it awake and refresh periodically to clear any long-run drift.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const req = async () => { try { lock = (await (navigator as WakeNavigator).wakeLock?.request('screen')) ?? null; } catch { lock = null; } };
    void req();
    const vis = () => { if (document.visibilityState === 'visible') void req(); };
    document.addEventListener('visibilitychange', vis);
    const reload = setInterval(() => { if (!arrivingRef.current && navigator.onLine) window.location.reload(); }, SAFETY_RELOAD_MS);
    return () => { document.removeEventListener('visibilitychange', vis); clearInterval(reload); void lock?.release().catch(() => {}); };
  }, []);

  const active = arriving ? 'arrivo' : scene;
  const on = (s: TvScene | 'arrivo') => (active === s ? 'is-active' : '');
  const dedication = scene === 'dedica' ? selected : null;
  const arrivingProject = arriving ? projectOf(arriving) : undefined;

  return (
    <div className="tv-scene" data-beat={active} data-testid="tv-scene">
      <div className="tv-tree">
        <TreeStage ornaments={ornaments} selected={selected} tv arrivingId={arriving?.id ?? null} reduced={reduced} />
        {arriving && <div key={`glow-${arriving.id}`} className="tv-arrival-glow" aria-hidden />}
      </div>
      <div className="tv-vignette" aria-hidden />

      <header className="tv-brand">
        <CriLockup className="h-[5.4cqw]" />
        <p className="mt-[1.3cqw] font-display text-[1.9cqw] leading-tight">L’Albero dei Regali di Monza</p>
      </header>

      <TvKindness reduced={reduced} />

      <div className="tv-counter" data-testid="tv-count-box">
        <span className="font-display text-[2.2cqw] leading-none text-gold" data-testid="tv-count">{addedCount}</span>
        <span className="text-[1.35cqw]">{addedCount === 1 ? 'gesto' : 'gesti'} di solidarietà</span>
        <span className="tv-demo-tag">dato DEMO</span>
        {error && <span className="text-[1.1cqw] text-gold">· connessione in ripristino</span>}
      </div>

      <aside className="tv-panel">
        <div className="tv-twinkles" aria-hidden><i /><i /><i /><i /><i /></div>
        <div className="flex items-center justify-between">
          <div className="flex gap-[0.6cqw]" aria-hidden>
            {sequence.map((s) => <span key={s} className={`tv-dot ${!arriving && scene === s ? 'is-on' : ''}`} />)}
          </div>
          <span className="tv-demo-badge">DEMO · donazioni simulate</span>
        </div>

        <div className="tv-scenes" aria-live="polite">
          <section className={`tv-card ${on('invito')}`} data-scene="invito">
            <p className="tv-kicker">Il Natale che fa bene</p>
            <h2 className="tv-headline font-display">La prossima pallina potrebbe essere <em className="text-gold">la tua!</em></h2>
            <p className="tv-lead">Scegli un regalo per Monza. Anche con 5 €. Appendilo all’Albero digitale.</p>
          </section>

          <section className={`tv-card ${on('passi')}`} data-scene="passi">
            <p className="tv-kicker">Come partecipare</p>
            <ol className="mt-[1.6cqw] space-y-[1.5cqw]">
              {['Inquadra il QR qui sotto con il telefono', 'Scegli un regalo per Monza, anche con 5 €', 'La tua pallina si accende su questo albero'].map((t, i) => (
                <li key={t} className="flex items-center gap-[1.4cqw]">
                  <span className="tv-step font-display">{i + 1}</span>
                  <span className="text-[2cqw] leading-snug">{t}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className={`tv-card ${on('attivita')}`} data-scene="attivita">
            <p className="tv-kicker">Quattro regali per Monza</p>
            <ul className="mt-[1.4cqw] space-y-[1.1cqw]">
              {PROJECTS.map((p) => (
                <li key={p.id} className="flex items-center gap-[1.3cqw]">
                  <OrnamentIcon kind={p.ornament} className="h-[4.4cqw] w-[4cqw] shrink-0" />
                  <span>
                    <span className="block font-display text-[2cqw] leading-tight">{p.title}</span>
                    <span className="block text-[1.3cqw] text-muted-foreground">{p.kicker}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`tv-card ${on('casetta')}`} data-scene="casetta" data-testid="tv-events">
            <div className="flex items-start gap-[1.6cqw]">
              <div className="min-w-0 flex-1">
                <p className="tv-kicker flex items-center gap-[0.6cqw]"><MapPin className="h-[1.4cqw] w-[1.4cqw]" />Casetta Croce Rossa</p>
                <h2 className="mt-[0.8cqw] font-display text-[3.3cqw] leading-[1.05]">Ti aspettiamo in Piazza San Paolo</h2>
                <p className="mt-[0.9cqw] text-[1.6cqw] text-gold">Dal {CASETTA.from} al {CASETTA.until}</p>
                <p className="tv-lead">Vieni a conoscere i progetti e i volontari di Croce Rossa Monza.</p>
              </div>
              {/* Official poster, inside the panel only: never over the tree or the QR. Absent until the file is supplied. */}
              <CasettaPoster placeholder={false} className="w-[9.5cqw] shrink-0 rounded-[0.6cqw]" />
            </div>
            {events.length > 0 && (
              <div className="mt-[1.4cqw]">
                <p className="flex items-center gap-[0.6cqw] text-[1.25cqw] font-semibold uppercase tracking-wide text-gold"><CalendarDays className="h-[1.3cqw] w-[1.3cqw]" />Prossimi appuntamenti</p>
                <ul className="mt-[0.6cqw] space-y-[0.7cqw]">
                  {events.slice(0, 2).map((e) => (
                    <li key={e.id} className="border-l-2 border-gold/60 pl-[1cqw]" data-testid="tv-event">
                      <p className="text-[1.25cqw] text-gold/90">{formatEventWhen(e)}</p>
                      <p className="font-display text-[1.8cqw] leading-tight">{e.title}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className={`tv-card ${on('dedica')}`} data-scene="dedica">
            {dedication && (
              <>
                <p className="tv-kicker">Una dedica per Monza</p>
                <div className="tv-tag mt-[1.6cqw]">
                  <p className="font-display text-[2.2cqw] leading-snug">“{dedication.dedica}”</p>
                  <p className="mt-[1cqw] text-[1.4cqw] font-semibold">— {dedication.firma ?? 'Anonimo'}</p>
                  <p className="mt-[0.6cqw] text-[1.15cqw] text-muted-foreground">{projectOf(dedication)?.title ?? ''} · dedica pubblicata con consenso</p>
                </div>
              </>
            )}
          </section>

          <section className={`tv-card ${on('auguri')}`} data-scene="auguri" data-testid="tv-wishes">
            <p className="tv-kicker">Dal Muro degli auguri</p>
            <p className="mt-[0.6cqw] text-[1.5cqw] text-muted-foreground">Biglietti lasciati alla casetta e letti dallo staff</p>
            <div className="tv-notes">
              {wishTrio.map((w, i) => (
                <div key={`${w.id}-${i}`} className={`wish-note tv-note wish-paper-${noteLook(w.id).paper}`} style={{ ['--i' as string]: i, ['--tilt' as string]: `${noteLook(w.id).rotate}deg` }}>
                  <span className="wish-pin" style={{ transform: 'translateX(-50%)' }} aria-hidden />
                  <span className="wish-text line-clamp-5 block">{w.body}</span>
                  <span className="mt-[0.5cqw] block text-right text-[1cqw] font-semibold">— {w.nickname ?? 'Un augurio da Monza'}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={`tv-card ${on('arrivo')}`} data-scene="arrivo">
            {arriving && (
              <div key={`a-${arriving.id}`} className="tv-arrival">
                <p className="tv-kicker">Proprio adesso</p>
                <div className="mt-[1.2cqw] flex items-center gap-[1.6cqw]">
                  <OrnamentIcon kind={arriving.kind} className="tv-arrival-icon h-[8.8cqw] w-[8cqw] shrink-0" />
                  <h2 className="font-display text-[3.2cqw] leading-[1.05]">Una nuova pallina è stata appesa!</h2>
                </div>
                <p className="tv-lead">{arrivingProject ? `${arrivingProject.title}: grazie!` : 'Grazie!'} La prossima potrebbe essere la tua.</p>
                {arriving.dedica && <p className="mt-[1cqw] font-display text-[1.7cqw] italic text-gold">“{arriving.dedica}”</p>}
              </div>
            )}
          </section>
        </div>

        <div className="tv-qr-block">
          <TvQr className="w-[15.5cqw] shrink-0" />
          <div>
            <p className="font-display text-[2.2cqw] leading-tight">Inquadra e scegli il tuo regalo</p>
            <p className="mt-[1cqw] text-[1.6cqw] leading-snug">Oppure chiedi ai volontari alla casetta</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

