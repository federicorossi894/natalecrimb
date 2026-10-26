import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  calendarPhase, ceremonyDue, ceremonyKey, demoDoor, tvDay, useKindnessCalendar, type CalendarPhase,
} from "@/lib/kindness";
import { AdventCeremony, ceremonyLength } from "./AdventCeremony";

const LAST_KEY = "cri-tv-kindness-ceremony";
export { CEREMONY_MS } from "./AdventCeremony";

/** Preview-only: shows the 12:00 moment for any day at a given point of its timeline, touching no real data. */
export type AdventPreview = { day: number; elapsed: number };

/**
 * Casetta screen corner for the Calendario della Gentilezza. At 12:00 Europe/Rome (server-corrected clock) the
 * day's door opens once with the full-frame sede scene, then the message stays as a compact corner card.
 * A screen started or reloaded after 12:00 shows the message straight away, never the ceremony again.
 * In the preview the ceremony never starts by itself: it is driven by `advent`.
 */
export function TvKindness({ reduced, preview = false, advent = null }: { reduced: boolean; preview?: boolean; advent?: AdventPreview | null }) {
  const { doors, status, now, reload } = useKindnessCalendar(10 * 60_000);
  const [state, setState] = useState<{ day: number; phase: CalendarPhase } | null>(null);
  const [ceremony, setCeremony] = useState<{ day: number; t0: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "ready") return;
    const tick = () => {
      const d = now();
      const day = tvDay(d);
      const phase = calendarPhase(d);
      const key = ceremonyKey(d, day);
      let last: string | null = null;
      try { last = localStorage.getItem(LAST_KEY); } catch { last = null; }
      if (!preview && ceremonyDue(prev.current, day, phase, last, key)) {
        try { localStorage.setItem(LAST_KEY, key); } catch { /* ignore */ }
        setElapsed(0);
        setCeremony({ day, t0: Date.now() });
        void reload();
      }
      prev.current = day;
      setState((s) => (s && s.day === day && s.phase === phase ? s : { day, phase }));
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [status, now, reload, preview]);

  // Live ceremony clock: ends by itself and hands the screen back to the normal loop.
  useEffect(() => {
    if (!ceremony) return;
    const total = ceremonyLength(reduced);
    const id = setInterval(() => {
      const ms = Date.now() - ceremony.t0;
      if (ms >= total) setCeremony(null);
      else setElapsed(ms);
    }, 200);
    return () => clearInterval(id);
  }, [ceremony, reduced]);

  const playing = advent ? { day: advent.day, elapsed: advent.elapsed } : ceremony ? { day: ceremony.day, elapsed } : null;
  if (playing) {
    const real = doors.find((x) => x.day === playing.day);
    const door = real?.message ? real : preview ? demoDoor(playing.day) : { day: playing.day, title: null, message: null };
    return <AdventCeremony key={playing.day} day={playing.day} door={door} demo={!real?.message && preview} reduced={reduced} elapsed={playing.elapsed} />;
  }

  if (!state) return null;
  const door = state.day >= 1 ? doors.find((x) => x.day === state.day) : undefined;

  let kicker = "Calendario della Gentilezza";
  let title = "";
  let text = "";
  if (state.phase === "preview") { title = "Dal 1° dicembre"; text = "Ogni giorno a mezzogiorno si apre qui una finestrella con un gesto gentile."; }
  else if (state.phase === "closed") { title = "Grazie per 24 giorni di gentilezza"; text = "Buone feste da Croce Rossa Italiana – Comitato di Monza."; }
  else if (state.day === 0) { title = "Oggi alle 12:00"; text = "Si apre la prima finestrella del Calendario della Gentilezza."; }
  else if (door?.message) { kicker = `${state.day} dicembre · Gesto del giorno`; title = door.title ?? ""; text = door.message; }
  else return null;

  return (
    <div className="tv-kindness" data-testid="tv-kindness" data-day={state.day} data-phase={state.phase}>
      <p className="flex items-center gap-[0.5cqw] text-[1cqw] font-semibold uppercase tracking-[0.12em] text-gold"><Sparkles className="h-[1.1cqw] w-[1.1cqw]" />{kicker}</p>
      <p className="mt-[0.4cqw] font-display text-[1.55cqw] leading-tight">{title}</p>
      <p className="mt-[0.3cqw] line-clamp-3 text-[1.1cqw] leading-snug">{text}</p>
    </div>
  );
}
