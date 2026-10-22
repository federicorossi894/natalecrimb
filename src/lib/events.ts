import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/** Casetta events shared through Lovable Cloud. Only visible + confirmed + upcoming rows are public (RLS). */
export type CasettaEvent = { id: string; title: string; description: string; starts_at: string; ends_at: string | null };

export const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Titolo troppo corto").max(80, "Massimo 80 caratteri"),
    description: z.string().trim().max(240, "Massimo 240 caratteri"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
    start: z.string().regex(/^\d{2}:\d{2}$/, "Ora di inizio non valida"),
    end: z.string().regex(/^(\d{2}:\d{2})?$/, "Ora di fine non valida"),
    confirmed: z.boolean(),
    visible: z.boolean(),
  })
  .refine((v) => !v.end || v.end > v.start, { message: "L’ora di fine deve seguire l’inizio", path: ["end"] });

function romeOffsetMs(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return Date.UTC(+parts["year"]!, +parts["month"]! - 1, +parts["day"]!, +parts["hour"]!, +parts["minute"]!, +parts["second"]!) - d.getTime();
}

/** Converts a wall-clock date/time in Monza (Europe/Rome) to an ISO UTC timestamp. */
export function romeToIso(date: string, time: string) {
  const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
  const [h = 0, mi = 0] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  return new Date(guess - romeOffsetMs(new Date(guess))).toISOString();
}

export function formatEventWhen(e: Pick<CasettaEvent, "starts_at" | "ends_at">) {
  const day = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long" }).format(new Date(e.starts_at));
  const time = (iso: string) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  return `${day} · ${time(e.starts_at)}${e.ends_at ? `–${time(e.ends_at)}` : ""}`;
}

export async function fetchUpcomingEvents(limit = 3): Promise<CasettaEvent[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("casetta_events")
    .select("id,title,description,starts_at,ends_at")
    .eq("visible", true)
    .eq("confirmed", true)
    .or(`starts_at.gt.${now},ends_at.gt.${now}`)
    .order("starts_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function useCasettaEvents(refreshMs = 5 * 60 * 1000) {
  const [events, setEvents] = useState<CasettaEvent[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => fetchUpcomingEvents().then((e) => { if (alive) setEvents(e); }).catch(() => {});
    load();
    const t = setInterval(load, refreshMs);
    return () => { alive = false; clearInterval(t); };
  }, [refreshMs]);
  return events;
}

/** Illustrative examples only: shown on TV, labelled DEMO, when no confirmed event exists. */
export const EXAMPLE_EVENTS = [
  { title: "Misurazione pressione e glicemia", description: "Esempio di attività sanitaria alla casetta." },
  { title: "Disostruzione pediatrica: dimostrazione", description: "Esempio di momento formativo per famiglie." },
];
