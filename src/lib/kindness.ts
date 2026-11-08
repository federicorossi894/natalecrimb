import { useCallback } from "react";
import { useResilientPoll } from './resilient-poll';
import { publicReadClient } from './public-read-client';

/**
 * Calendario della Gentilezza. The server decides which doors are open (public.kindness_calendar uses the
 * Europe/Rome date of the database clock) and never sends the text of future doors. These helpers mirror that
 * rule only to drive the UI between fetches; the visitor's clock is corrected with the server time.
 */
export const ROME_TZ = "Europe/Rome";
/** Daily TV moment (Europe/Rome). Visitors' doors still unlock at midnight; this is only the casetta screen event. */
export const CEREMONY_HOUR = 12;
export const DOORS = 24;

export type RomeParts = { year: number; month: number; day: number; hour: number; minute: number };
const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: ROME_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
export function romeParts(d: Date): RomeParts {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { year: Number(p["year"]), month: Number(p["month"]), day: Number(p["day"]), hour: Number(p["hour"]) % 24, minute: Number(p["minute"]) };
}

/** Same rule as public.kindness_unlocked_day. */
export function unlockedDay(d: Date) {
  const r = romeParts(d);
  return r.month === 12 ? Math.min(r.day, DOORS) : r.month === 1 ? DOORS : 0;
}

export type CalendarPhase = "preview" | "open" | "closed";
export function calendarPhase(d: Date): CalendarPhase {
  const r = romeParts(d);
  if (r.month === 12 && r.day <= DOORS) return "open";
  if (r.month === 12 || r.month === 1) return "closed";
  return "preview";
}

/** Door the casetta screen shows: today's only from 12:00 Rome, yesterday's before. 0 = nothing open yet. */
export function tvDay(d: Date) {
  const r = romeParts(d);
  if (r.month === 12 && r.day <= DOORS) return r.hour >= CEREMONY_HOUR ? r.day : r.day - 1;
  if (r.month === 12 || r.month === 1) return DOORS;
  return 0;
}

export const seasonYear = (d: Date) => { const r = romeParts(d); return r.month === 1 ? r.year - 1 : r.year; };
export const ceremonyKey = (d: Date, day: number) => `${seasonYear(d)}-${day}`;

/**
 * The opening ceremony plays only when 12:00 passes while the screen is on, and once per day per screen:
 * a TV started or reloaded after 12:00 shows the message straight away, without the ceremony.
 */
export function ceremonyDue(prevDay: number | null, nowDay: number, phase: CalendarPhase, lastShown: string | null, key: string) {
  return prevDay !== null && phase === "open" && nowDay >= 1 && nowDay > prevDay && lastShown !== key;
}

/** No replay after suspension or a large clock correction; only a continuously observed noon boundary. */
export function crossedNoon(previous: Date | null, now: Date) {
  if (!previous) return false;
  const gap = now.getTime() - previous.getTime();
  const r = romeParts(now);
  return gap > 0 && gap <= 15_000 && r.month === 12 && r.day <= 24 && r.hour === CEREMONY_HOUR && r.minute === 0 && tvDay(now) > tvDay(previous);
}


/** Shown before 1 December so the page can be presented; clearly an example, never one of the 24 doors. */
export const EXAMPLE_DOOR = {
  title: "Un esempio di finestrella",
  message: "Dal 1° dicembre, dietro ogni finestrella trovi un piccolo gesto gentile da fare a Monza, a casa o a scuola. Uno al giorno, fino alla Vigilia.",
};

export type Door = { day: number; title: string | null; message: string | null };

/**
 * DEMO stand-in for a door whose real text is not public yet (the server never sends future texts).
 * Always labelled as an example; never presented as one of the 24 configured messages.
 */
export const demoDoor = (day: number): Door => ({
  day,
  title: `Il gesto del ${day} dicembre`,
  message: `${EXAMPLE_DOOR.message} Il gesto vero di questa finestrella comparirà il ${day} dicembre.`,
});

export function useKindnessCalendar(refreshMs = 10 * 60_000) {
  const poll = useResilientPoll(async signal => {
    const t0 = Date.now();
    const { data, error } = await publicReadClient().rpc("kindness_calendar").abortSignal(signal);
    const t1 = Date.now();
    if (error || !data) throw new Error('Calendar unavailable');
    const srv = data[0]?.server_now ? new Date(data[0].server_now).getTime() : t1;
    return { offset: Number.isFinite(srv) ? srv - (t0 + t1) / 2 : 0, doors: data.map(d => ({ day: d.day, title: d.title ?? null, message: d.message ?? null })) };
  }, { offset: 0, doors: [] as Door[] }, refreshMs);
  const { offset, doors } = poll.data;
  /** Server-corrected clock. */
  const now = useCallback(() => new Date(Date.now() + offset), [offset]);
  return { doors, status: poll.loaded ? 'ready' as const : poll.error ? 'error' as const : 'loading' as const, error: poll.error || poll.stale, now, reload: poll.refresh };
}

const OPENED_KEY = "cri-kindness-opened";
export function loadOpened(season: number): number[] {
  try { const s = JSON.parse(localStorage.getItem(`${OPENED_KEY}-${season}`) ?? "[]"); return Array.isArray(s) ? s.filter((n) => typeof n === "number") : []; } catch { return []; }
}
export function saveOpened(season: number, days: number[]) {
  try { localStorage.setItem(`${OPENED_KEY}-${season}`, JSON.stringify(days)); } catch { /* private mode */ }
}
