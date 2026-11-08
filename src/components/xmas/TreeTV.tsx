import { CAMPAIGN } from "@/lib/campaign";
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { useTreeStore } from '@/lib/tree-store';
import { useCasettaEventsStatus, formatEventWhen } from '@/lib/events';
import { ARRIVAL_MS, queueArrivals, startTvReliability } from '@/lib/tv-reliability';
import { PROJECTS, type TreeOrnament } from '@/lib/data';
import { CASETTA } from '@/lib/casetta';
import { CasettaPoster } from './CasettaMedia';
import { TvQr } from './Qr';
import { CriLockup, OrnamentIcon } from './Ornament';
import { useReducedMotion } from './TreeExperience';
import { TreeStage } from './TreeStage';
import { TvKindness, type AdventPreview } from './TvKindness';
import { usePublicWishes, wallWishes, DEMO_WISHES, type PublicWish } from '@/lib/wishes';
import { layoutWall, DEFAULT_SIGNATURE } from '@/lib/tv-wall';

/** Silent director: every scene keeps the tree, the QR and the CRI signature on screen. */
export type TvScene = 'invito' | 'passi' | 'attivita' | 'casetta' | 'dedica' | 'auguri';
export const TV_DURATION: Record<TvScene, number> = { invito: 18000, passi: 14000, attivita: 14000, casetta: 14000, dedica: 12000, auguri: 14000 };
/** Dedication and wishes scenes exist only when at least one approved, public item exists. */
export const tvSequence = (hasPublicDedication: boolean, hasApprovedWishes = false, capabilities = CAMPAIGN): TvScene[] => [
  'invito', 'passi', 'attivita', 'casetta',
  ...(hasPublicDedication ? (['dedica'] as const) : []),
  ...(capabilities.publicWishWall && hasApprovedWishes ? (['auguri'] as const) : []),
];

const projectOf = (o: TreeOrnament) => PROJECTS.find((p) => p.ornament === o.kind);

/** Scenes the presentation preview can show, in director order (the arrival card is a beat, not a loop scene). */
export type TvBeat = TvScene | 'arrivo';
/** Preview control: shows one real scene immediately, with no loop, no wake lock and no reload. */
export type TvPreview = { beat: TvBeat; advent?: AdventPreview | null };

/** Fictitious dedication, used only in the preview when the shared tree has no public dedication yet. */
const PREVIEW_DEDICATION = { dedica: 'Per chi ogni sera porta un tè caldo e un sorriso in strada. Grazie!', firma: 'Esempio DEMO' };

/** Autonomous, silent 24/7 casetta screen: big tree on the left, warm invitation + large QR on the right. */
export function TreeTV({ preview }: { preview?: TvPreview } = {}) {
  const { addedOrnaments: ornaments, addedCount, error, loaded } = useTreeStore({ publicOnly: true });
  const { events, error: eventsError } = useCasettaEventsStatus();
  const { wishes, loaded: wishesLoaded, error: wishesError } = usePublicWishes(60_000);
  const [calendarError, setCalendarError] = useState(false);
  const [ceremonyPlaying, setCeremonyPlaying] = useState(false);
  const ceremonyRef = useRef(false);
  const arrivalQueue = useRef<TreeOrnament[]>([]);
  const wishesRef = useRef<PublicWish[]>(wishes);
  const wishCursor = useRef(0);
  const [wishPage, setWishPage] = useState<PublicWish[]>([]);
  const knownWishes = useRef<Set<string> | null>(null);
  const [newWishIds, setNewWishIds] = useState<ReadonlySet<string>>(new Set());
  const [scene, setScene] = useState<TvScene>('invito');
  const [selected, setSelected] = useState<TreeOrnament | null>(null);
  const [arriving, setArriving] = useState<TreeOrnament | null>(null);
  const previous = useRef<Set<string | number> | null>(null);
  const ornamentsRef = useRef(ornaments);
  const arrivingRef = useRef(arriving);
  const step = useRef(0);
  const cursor = useRef(0);
  const reduced = useReducedMotion();
  const realDedications = useMemo(() => ornaments.filter((o) => o.dedica), [ornaments]);
  // Preview only: when no public dedication exists yet, one ornament carries a clearly labelled fictitious example.
  const previewDedication = useMemo(() => {
    const last = ornaments[ornaments.length - 1];
    if (!preview || realDedications.length || !last) return null;
    return { ...last, ...PREVIEW_DEDICATION };
  }, [preview, realDedications.length, ornaments]);
  const shownOrnaments = useMemo(
    () => (previewDedication ? ornaments.map((o) => (o.id === previewDedication.id ? previewDedication : o)) : ornaments),
    [ornaments, previewDedication],
  );
  const publicDedications = previewDedication ? [previewDedication] : realDedications;
  const hasDedications = publicDedications.length > 0;
  // The wall lists approved wishes only; while they are few it adds the "Esempio · DEMO" notes, like /auguri.
  const wallSource = useMemo(() => (wishes.length ? wallWishes(wishes) : preview ? DEMO_WISHES : []), [wishes, preview]);
  const sequence = preview ? tvSequence(true, true) : tvSequence(hasDedications, wishes.length > 0);

  useEffect(() => { ornamentsRef.current = ornaments; }, [ornaments]);
  useEffect(() => { arrivingRef.current = arriving; }, [arriving]);
  useEffect(() => { wishesRef.current = wallSource; }, [wallSource]);

  // Newly approved wishes get a gentle "just pinned" animation the next time the wall is on screen.
  useEffect(() => {
    if (!wishesLoaded) return;
    const ids = new Set(wishes.map((w) => w.id));
    const prev = knownWishes.current;
    // The first load is the wall as it already is, not a batch of new notes.
    if (prev) {
      const fresh = wishes.filter((w) => !prev.has(w.id)).map((w) => w.id);
      setNewWishIds((cur) => new Set([...cur].filter(id => ids.has(id)).concat(fresh)));
    }
    knownWishes.current = ids;
  }, [wishes, wishesLoaded]);

  /** Next wall page: fresh wishes first, then continue the rotation from the cursor. */
  const nextWishPage = (list: PublicWish[]) => {
    if (!list.length) return [];
    const fresh = list.filter((w) => newWishIds.has(w.id));
    const start = wishCursor.current % list.length;
    const rotated = [...list.slice(start), ...list.slice(0, start)].filter((w) => !newWishIds.has(w.id));
    const page = [...fresh, ...rotated];
    const { used } = layoutWall(page, newWishIds);
    wishCursor.current = (start + Math.max(1, used - fresh.length)) % list.length;
    return page.slice(0, Math.max(1, used));
  };
  const nextWishRef = useRef(nextWishPage);
  nextWishRef.current = nextWishPage;

  // New gift detection (polling via useTreeStore). The first non-empty load is the existing tree, not an arrival.
  useEffect(() => {
    if (!loaded) return;
    const ids = new Set(ornaments.map((o) => o.id));
    const prev = previous.current;
    if (!preview && prev) {
      arrivalQueue.current = queueArrivals(arrivalQueue.current, ornaments.filter(o => !prev.has(o.id)));
      if (!arrivingRef.current) {
        const next = arrivalQueue.current.shift();
        if (next) { arrivingRef.current = next; setArriving(next); setSelected(next); }
      }
    }
    previous.current = ids;
  }, [ornaments, loaded, preview]);
  useEffect(() => {
    if (!arriving || preview) return;
    const t = setTimeout(() => {
      const next = arrivalQueue.current.shift() ?? null;
      arrivingRef.current = next; setArriving(next); setSelected(next);
    }, ARRIVAL_MS);
    return () => clearTimeout(t);
  }, [arriving]);

  // Scene loop (≈60 s, ≈72 s with dedications), paused during an arrival.
  useEffect(() => {
    if (arriving || preview) return;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      const pub = ornamentsRef.current.filter((o) => o.dedica);
      const w = wishesRef.current;
      const seq = tvSequence(pub.length > 0, w.length > 0);
      const s = seq[step.current % seq.length] ?? 'invito';
      step.current = (step.current + 1) % seq.length;
      if (s === 'dedica') { setSelected(pub[cursor.current % pub.length] ?? null); cursor.current = (cursor.current + 1) % pub.length; }
      else setSelected(null);
      if (s === 'auguri') setWishPage(nextWishRef.current(w));
      setScene(s);
      timer = setTimeout(run, TV_DURATION[s]);
    };
    run();
    return () => clearTimeout(timer);
  }, [arriving, preview]);

  // Preview: apply the chosen beat immediately with the same states the loop would produce.
  const previewBeat = preview?.beat;
  useEffect(() => {
    if (!previewBeat || (previewBeat === "auguri" && !CAMPAIGN.publicWishWall)) return;
    const list = ornamentsRef.current;
    if (previewBeat === 'arrivo') {
      const last = list[list.length - 1] ?? null;
      setArriving(last); setSelected(last); setScene('invito');
      return;
    }
    setArriving(null);
    setSelected(previewBeat === 'dedica' ? (publicDedications[0] ?? null) : null);
    if (previewBeat === 'auguri') setWishPage(nextWishRef.current(wishesRef.current));
    setScene(previewBeat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewBeat, publicDedications[0]?.id, ornaments.length > 0, wallSource.length]);

  // Unattended screen: keep it awake and refresh periodically to clear any long-run drift.
  useEffect(() => {
    if (preview) return;
    return startTvReliability(() => !!arrivingRef.current || ceremonyRef.current);
  }, [preview]);

  const active = arriving ? 'arrivo' : scene;
  const on = (s: TvScene | 'arrivo') => (active === s ? 'is-active' : '');
  // Successful moderation refreshes redact snapshots immediately, not at the next director beat.
  const currentSelected = publicDedications.find(o => o.id === selected?.id) ?? null;
  const dedication = scene === 'dedica' ? currentSelected : null;
  const currentArrival = ornaments.find(o => o.id === arriving?.id) ?? null;
  const arrivingProject = arriving ? projectOf(arriving) : undefined;
  const wall = useMemo(() => layoutWall(wishPage.filter(w => wallSource.some(current => current.id === w.id)), newWishIds), [wishPage, wallSource, newWishIds]);
  const isPreviewDedication = !!previewDedication && dedication?.id === previewDedication.id;
  // Once a fresh wish has been shown on the wall it becomes an ordinary note.
  useEffect(() => {
    if (scene !== 'auguri' || !newWishIds.size) return;
    const t = setTimeout(() => setNewWishIds(new Set()), TV_DURATION.auguri);
    return () => clearTimeout(t);
  }, [scene, newWishIds.size]);

  return (
    <div className="tv-scene" data-beat={active} data-ceremony={ceremonyPlaying ? 'true' : undefined} data-testid="tv-scene">
      <div className="tv-tree">
        <TreeStage ornaments={shownOrnaments} selected={selected} tv arrivingId={arriving?.id ?? null} reduced={reduced} />
        {arriving && <div key={`glow-${arriving.id}`} className="tv-arrival-glow" aria-hidden />}
      </div>
      <div className="tv-vignette" aria-hidden />

      {/* Panoramic wish wall: full 16:9 width, 3–5 twine lines; the brand and the QR block stay visible on top. */}
      {CAMPAIGN.publicWishWall && <section className={`tv-wall ${active === 'auguri' ? 'is-active' : ''}`} data-scene="auguri" data-testid="tv-wishes" aria-hidden={active !== 'auguri'} style={{ ['--s' as string]: wall.scale }}>
        <div className="tv-wall-head">
          <p className="tv-kicker">Dal Muro degli auguri</p>
          <p className="mt-[0.4cqw] text-[1.35cqw]">Biglietti lasciati alla casetta e letti dallo staff</p>
        </div>
        {wall.rows.map((row, r) => (
          <div key={`${r}-${row.notes[0]?.wish.id}`} className="tv-wall-row" style={{ top: `${row.y}cqw`, left: '2.5cqw', width: `${row.right - 2.5}cqw` }}>
            {row.notes.map((n, k) => (
              <div
                key={n.wish.id}
                className={`wish-note tv-wall-note wish-paper-${['ivory', 'kraft', 'snow', 'blush'][(r + k * 3 + n.wish.id.length) % 4]} ${n.isNew ? 'is-new' : ''}`}
                data-testid="tv-wall-note"
                data-demo={n.wish.demo ? 'true' : undefined}
                style={{ width: `${n.width}cqw`, ['--tilt' as string]: `${n.tilt}deg`, ['--lift' as string]: `${n.drop}cqw`, ['--i' as string]: r * 2 + k }}
              >
                <span className="wish-pin" aria-hidden />
                {n.wish.demo && <span className="wish-demo-stamp tv-wall-stamp">Esempio · DEMO</span>}
                <span className="wish-text tv-wall-text" style={{ WebkitLineClamp: n.lines }}>{n.wish.body}</span>
                <span className="tv-wall-sig">— {n.wish.nickname ?? DEFAULT_SIGNATURE}</span>
              </div>
            ))}
          </div>
        ))}
      </section>}

      <header className="tv-brand">
        <CriLockup className="h-[5.4cqw]" />
        <p className="mt-[1.3cqw] font-display text-[1.9cqw] leading-tight">L’Albero dei Regali di Monza</p>
      </header>

      <TvKindness reduced={reduced} preview={!!preview} advent={preview?.advent ?? null} onPlayingChange={playing => { ceremonyRef.current = playing; setCeremonyPlaying(playing); }} onHealthChange={setCalendarError} />

      <div className="tv-counter" data-testid="tv-count-box">
        <span className="font-display text-[2.2cqw] leading-none text-gold" data-testid="tv-count">{addedCount}</span>
        <span className="text-[1.35cqw]">{addedCount === 1 ? 'gesto' : 'gesti'} di solidarietà</span>
        {CAMPAIGN.demo && <span className="tv-demo-tag">dato DEMO</span>}
        {(error || eventsError || wishesError || calendarError) && <span className="text-[1.1cqw] text-gold">· connessione in ripristino</span>}
      </div>

      <aside className="tv-panel">
        <div className="tv-twinkles" aria-hidden><i /><i /><i /><i /><i /></div>
        <div className="flex items-center justify-between">
          <div className="flex gap-[0.6cqw]" aria-hidden>
            {sequence.map((s) => <span key={s} className={`tv-dot ${!arriving && scene === s ? 'is-on' : ''}`} />)}
          </div>
          {CAMPAIGN.demo && <span className="tv-demo-badge">DEMO · donazioni simulate</span>}
        </div>

        <div className="tv-scenes" aria-live="polite">
          <section className={`tv-card ${on('invito')}`} data-scene="invito">
            <p className="tv-kicker">Il Natale che fa bene</p>
            <h2 className="tv-headline font-display">La prossima pallina potrebbe essere <em className="text-gold">la tua!</em></h2>
            <p className="tv-lead">{CAMPAIGN.demo || CAMPAIGN.livePayments ? "Scegli un regalo per Monza. Anche con 5 €. Appendilo all’Albero digitale." : "Scopri i progetti di Croce Rossa Monza. Le donazioni online sono in attivazione."}</p>
          </section>

          <section className={`tv-card ${on('passi')}`} data-scene="passi">
            <p className="tv-kicker">Come partecipare</p>
            <ol className="mt-[1.6cqw] space-y-[1.5cqw]">
              {['Inquadra il QR qui sotto con il telefono', 'Scegli un regalo per Monza, anche con 5 €', CAMPAIGN.demo || CAMPAIGN.livePayments ? 'La tua pallina si accende su questo albero' : 'Scopri le attività e il Calendario della Gentilezza'].map((t, i) => (
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
                  <p className="mt-[0.6cqw] text-[1.15cqw] text-muted-foreground">{projectOf(dedication)?.title ?? ''} · {isPreviewDedication ? 'dedica di esempio · DEMO' : 'dedica pubblicata con consenso'}</p>
                </div>
              </>
            )}
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
                {currentArrival?.dedica && <p className="mt-[1cqw] font-display text-[1.7cqw] italic text-gold">“{currentArrival.dedica}”</p>}
              </div>
            )}
          </section>
        </div>

        <div className="tv-qr-block">
          <TvQr className="w-[15.5cqw] shrink-0" />
          <div>
            <p className="font-display text-[2.2cqw] leading-tight">Inquadra e scegli il tuo regalo</p>
            {CAMPAIGN.volunteerCashDonations && <p className="mt-[1cqw] text-[1.6cqw] leading-snug">Oppure chiedi ai volontari alla casetta</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}

