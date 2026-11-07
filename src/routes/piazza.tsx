import { CAMPAIGN } from "@/lib/campaign";
import { useCasettaEvents, formatEventWhen } from "@/lib/events";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { AGENDA_TODAY, CRI } from "@/lib/data";

export const Route = createFileRoute("/piazza")({
  head: () => ({
    meta: [
      { title: "Oggi in Piazza San Paolo – Casetta CRI Monza" },
      { name: "description", content: "Agenda della casetta Croce Rossa al Villaggio di Natale di Monza: mercatino, controlli, manovre salvavita." },
      { property: "og:title", content: "Oggi in Piazza San Paolo – Casetta CRI Monza" },
      { property: "og:description", content: "Cosa succede oggi alla casetta CRI del Villaggio di Natale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Piazza,
});

const START = new Date(2026, 10, 22);
const DAYS = Array.from({ length: 40 }).map((_, i) => {
  const d = new Date(START);
  d.setDate(d.getDate() + i);
  const tags = [i % 3 === 0 && "Pressione", i % 4 === 1 && "Salvavita", i % 7 === 5 && "Evento", "Panettoni"].filter(Boolean) as string[];
  return { d, tags };
});

function Piazza() {
  const [sel, setSel] = useState(0);
  const events = useCasettaEvents();
  const day = DAYS[sel]!;
  return (
    <Shell>
      <PageHead kicker="Villaggio di Natale · Monza" title={<>Oggi in<br /><span className="text-gold">Piazza San Paolo</span></>}>
        <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> Casetta Croce Rossa · centro di Monza</span>
      </PageHead>
      <section className="mx-auto max-w-6xl px-4">
        {CAMPAIGN.demo ? <><span className="rounded-full border hairline-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold">Contenuti demo da confermare</span>
        <ol className="relative mt-6 space-y-3 border-l border-gold/30 pl-6">
          {AGENDA_TODAY.map((a) => (
            <li key={a.title} className="glass relative rounded-2xl p-4">
              <span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
              <p className="text-sm font-semibold text-gold">{a.time}</p>
              <p className="font-display text-xl">{a.title}</p>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            </li>
          ))}
        </ol>

        <h2 className="mt-16 font-display text-3xl">I 40 giorni della casetta</h2>
        <p className="mt-1 text-sm text-muted-foreground">Calendario indicativo · orari e appuntamenti demo da confermare.</p>
        <div className="mt-6 flex snap-x gap-2 overflow-x-auto pb-3">
          {DAYS.map((x, i) => (
            <button key={i} onClick={() => setSel(i)} className={`flex w-16 shrink-0 snap-start flex-col items-center rounded-2xl py-3 transition ${sel === i ? "bg-primary text-primary-foreground" : "glass"} ${x.d.getDate() === 24 && x.d.getMonth() === 11 ? "ring-2 ring-gold" : ""}`}>
              <span className="text-[10px] uppercase opacity-80">{x.d.toLocaleDateString("it-IT", { weekday: "short" })}</span>
              <span className="font-display text-2xl">{x.d.getDate()}</span>
              <span className="text-[10px] uppercase opacity-80">{x.d.toLocaleDateString("it-IT", { month: "short" })}</span>
            </button>
          ))}
        </div>
        <div className="glass mt-3 rounded-2xl p-5">
          <p className="font-display text-xl capitalize">{day.d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {day.tags.map((t) => <span key={t} className="rounded-full bg-secondary px-3 py-1 text-sm">{t}</span>)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Programma di esempio · demo</p>
        </div>

        </> : <div className="space-y-4">{events.length ? events.map(e => <article key={e.id}><p className="text-gold">{formatEventWhen(e)}</p><h2 className="font-display text-xl">{e.title}</h2><p>{e.description}</p></article>) : <p>Ti aspettiamo alla casetta in Piazza San Paolo. Gli appuntamenti confermati saranno pubblicati qui.</p>}</div>}
        <a href={CRI.site} target="_blank" rel="noreferrer" className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
          Sito ufficiale CRI Monza <ExternalLink className="h-4 w-4" />
        </a>
      </section>
    </Shell>
  );
}
