import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  calendarPhase, ceremonyDue, ceremonyKey, tvDay, useKindnessCalendar, type CalendarPhase,
} from "@/lib/kindness";

const LAST_KEY = "cri-tv-kindness-ceremony";
export const CEREMONY_MS = 16000;

/**
 * Casetta screen corner for the Calendario della Gentilezza. At 10:00 Europe/Rome (server-corrected clock) the
 * day's door opens once with a short ceremony over the tree, then the message stays as a compact corner card.
 * A screen started or reloaded after 10:00 shows the message straight away, never the ceremony again.
 */
export function TvKindness({ reduced }: { reduced: boolean }) {
  const { doors, status, now, reload } = useKindnessCalendar(10 * 60_000);
  const [state, setState] = useState<{ day: number; phase: CalendarPhase } | null>(null);
  const [ceremony, setCeremony] = useState<number | null>(null);
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
      if (ceremonyDue(prev.current, day, phase, last, key)) {
        try { localStorage.setItem(LAST_KEY, key); } catch { /* ignore */ }
        setCeremony(day);
        void reload();
      }
      prev.current = day;
      setState((s) => (s && s.day === day && s.phase === phase ? s : { day, phase }));
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [status, now, reload]);

  useEffect(() => {
    if (ceremony === null) return;
    const t = setTimeout(() => setCeremony(null), reduced ? 10000 : CEREMONY_MS);
    return () => clearTimeout(t);
  }, [ceremony, reduced]);

  if (!state) return null;
  const door = state.day >= 1 ? doors.find((x) => x.day === state.day) : undefined;
  const cerDoor = ceremony !== null ? doors.find((x) => x.day === ceremony) : undefined;

  let kicker = "Calendario della Gentilezza";
  let title = "";
  let text = "";
  if (state.phase === "preview") { title = "Dal 1° dicembre"; text = "Ogni mattina alle 10 si apre qui una finestrella con un gesto gentile."; }
  else if (state.phase === "closed") { title = "Grazie per 24 giorni di gentilezza"; text = "Buone feste da Croce Rossa Italiana – Comitato di Monza."; }
  else if (state.day === 0) { title = "Oggi alle 10:00"; text = "Si apre la prima finestrella del Calendario della Gentilezza."; }
  else if (door?.message) { kicker = `${state.day} dicembre · Gesto del giorno`; title = door.title ?? ""; text = door.message; }
  else return null;

  return (
    <>
      {ceremony === null && (
        <div className="tv-kindness" data-testid="tv-kindness" data-day={state.day} data-phase={state.phase}>
          <p className="flex items-center gap-[0.5cqw] text-[1cqw] font-semibold uppercase tracking-[0.12em] text-gold"><Sparkles className="h-[1.1cqw] w-[1.1cqw]" />{kicker}</p>
          <p className="mt-[0.4cqw] font-display text-[1.55cqw] leading-tight">{title}</p>
          <p className="mt-[0.3cqw] line-clamp-3 text-[1.1cqw] leading-snug">{text}</p>
        </div>
      )}
      {ceremony !== null && (
        <div key={ceremony} className={`tv-advent ${reduced ? "is-reduced" : ""}`} data-testid="tv-advent" aria-live="polite">
          <div className="tv-advent-frame">
            <div className="tv-advent-inside">
              <p className="text-[1.1cqw] font-semibold uppercase tracking-[0.14em] text-burgundy">{ceremony} dicembre · Calendario della Gentilezza</p>
              <p className="mt-[0.8cqw] font-display text-[2.6cqw] leading-tight">{cerDoor?.title ?? "La finestrella di oggi"}</p>
              {cerDoor?.message && <p className="mt-[0.8cqw] text-[1.45cqw] leading-snug">{cerDoor.message}</p>}
            </div>
            <div className="tv-advent-leaf" aria-hidden><span className="font-display text-[8cqw] leading-none">{ceremony}</span><span className="mt-[0.6cqw] text-[1.1cqw] uppercase tracking-[0.2em]">dicembre</span></div>
          </div>
        </div>
      )}
    </>
  );
}
