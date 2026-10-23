import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Calendario della Gentilezza. The server decides which doors are open (public.kindness_calendar uses the
 * Europe/Rome date of the database clock) and never sends the text of future doors. These helpers mirror that
 * rule only to drive the UI between fetches; the visitor's clock is corrected with the server time.
 */
export const ROME_TZ = "Europe/Rome";
export const CEREMONY_HOUR = 10;
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

/** Door the casetta screen shows: today's only from 10:00 Rome, yesterday's before. 0 = nothing open yet. */
export function tvDay(d: Date) {
  const r = romeParts(d);
  if (r.month === 12 && r.day <= DOORS) return r.hour >= CEREMONY_HOUR ? r.day : r.day - 1;
  if (r.month === 12 || r.month === 1) return DOORS;
  return 0;
}

export const seasonYear = (d: Date) => { const r = romeParts(d); return r.month === 1 ? r.year - 1 : r.year; };
export const ceremonyKey = (d: Date, day: number) => `${seasonYear(d)}-${day}`;

/**
 * The opening ceremony plays only when 10:00 passes while the screen is on, and once per day per screen:
 * a TV started or reloaded after 10:00 shows the message straight away, without the ceremony.
 */
export function ceremonyDue(prevDay: number | null, nowDay: number, phase: CalendarPhase, lastShown: string | null, key: string) {
  return prevDay !== null && phase === "open" && nowDay >= 1 && nowDay > prevDay && lastShown !== key;
}

/** Visual order of the doors on the cabinet: shuffled once, the same for everyone. */
export const DOOR_ORDER = [13, 4, 21, 8, 1, 17, 10, 24, 6, 15, 2, 19, 11, 22, 5, 9, 16, 3, 20, 12, 7, 23, 14, 18];

/** Shown before 1 December so the page can be presented; clearly an example, never one of the 24 doors. */
export const EXAMPLE_DOOR = {
  title: "Un esempio di finestrella",
  message: "Dal 1° dicembre, dietro ogni finestrella trovi un piccolo gesto gentile da fare a Monza, a casa o a scuola. Uno al giorno, fino alla Vigilia.",
};

export type Door = { day: number; title: string | null; message: string | null };

export function useKindnessCalendar(refreshMs = 10 * 60_000) {
  const [doors, setDoors] = useState<Door[]>([]);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async () => {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc("kindness_calendar");
    const t1 = Date.now();
    if (error || !data) { setStatus((s) => (s === "ready" ? s : "error")); return; }
    const srv = data[0]?.server_now ? new Date(data[0].server_now).getTime() : t1;
    setOffset(srv - (t0 + t1) / 2);
    setDoors(data.map((d) => ({ day: d.day, title: (d.title as string | null) ?? null, message: (d.message as string | null) ?? null })));
    setStatus("ready");
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);
  /** Server-corrected clock. */
  const now = useCallback(() => new Date(Date.now() + offset), [offset]);
  return { doors, status, now, reload: load };
}

const OPENED_KEY = "cri-kindness-opened";
export function loadOpened(season: number): number[] {
  try { const s = JSON.parse(localStorage.getItem(`${OPENED_KEY}-${season}`) ?? "[]"); return Array.isArray(s) ? s.filter((n) => typeof n === "number") : []; } catch { return []; }
}
export function saveOpened(season: number, days: number[]) {
  try { localStorage.setItem(`${OPENED_KEY}-${season}`, JSON.stringify(days)); } catch { /* private mode */ }
}
