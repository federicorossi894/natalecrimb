import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Gift, Heart, Lock, Moon, Snowflake, Sparkles, Star, TreePine } from "lucide-react";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { Modal } from "@/components/xmas/Modal";
import { Snow } from "@/components/xmas/Snow";
import {
  DOOR_ORDER, EXAMPLE_DOOR, calendarPhase, loadOpened, saveOpened, seasonYear, useKindnessCalendar, type Door,
} from "@/lib/kindness";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario della Gentilezza · 24 gesti per Natale – CRI Monza" },
      { name: "description", content: "Dal 1 al 24 dicembre, una finestrella al giorno con un piccolo gesto gentile da fare a Monza, a casa o a scuola. Croce Rossa Italiana – Comitato di Monza." },
      { property: "og:title", content: "Calendario della Gentilezza · Il Natale che fa bene" },
      { property: "og:description", content: "24 finestrelle, 24 piccoli gesti gentili: una al giorno fino alla Vigilia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Calendario,
});

const MOTIFS = [Star, Snowflake, Heart, Bell, Gift, TreePine, Sparkles, Moon];
const TONES = ["red", "fir", "ivory", "burgundy"] as const;

function Calendario() {
  const { doors, status, now } = useKindnessCalendar();
  const ready = status === "ready";
  const d = now();
  const phase = ready ? calendarPhase(d) : null;
  const season = seasonYear(d);
  const byDay = useMemo(() => new Map(doors.map((x) => [x.day, x])), [doors]);
  const unlocked = doors.filter((x) => x.message).map((x) => x.day);
  const today = phase === "open" ? Math.max(0, ...unlocked) : 0;
  const [opened, setOpened] = useState<number[]>([]);
  const [show, setShow] = useState<Door | "example" | null>(null);
  const [hint, setHint] = useState("");
  useEffect(() => { if (ready) setOpened(loadOpened(season)); }, [ready, season]);

  const openDoor = (day: number) => {
    const door = byDay.get(day);
    if (!door?.message) { setHint(`La finestrella ${day} si apre il ${day} dicembre. Pazienza: la sorpresa è dietro la porta!`); return; }
    setHint("");
    if (!opened.includes(day)) { const next = [...opened, day]; setOpened(next); saveOpened(season, next); }
    setShow(door);
  };

  return (
    <Shell>
      <PageHead kicker="Calendario della Gentilezza" title={<>24 finestrelle, <em className="text-gold">24 gesti gentili.</em></>}>
        Dal 1 al 24 dicembre, ogni giorno si apre una finestrella con un piccolo gesto da fare a Monza, a casa o a scuola. Per grandi e piccoli, senza bisogno di niente: solo un po' di attenzione per chi ci sta intorno.
      </PageHead>

      <section className="mx-auto max-w-6xl px-4">
        {phase === "preview" && (
          <div className="glass mb-6 flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between" data-testid="calendar-preview">
            <p className="text-sm"><b className="font-display text-lg">Il calendario si apre il 1° dicembre.</b><br /><span className="text-muted-foreground">Le finestrelle seguono la data italiana: si aprono a mezzanotte, ora di Roma, qualunque sia l'orologio del tuo telefono.</span></p>
            <button type="button" onClick={() => setShow("example")} className="shrink-0 rounded-full border hairline-gold px-5 py-3 text-sm font-semibold text-gold">Prova una finestrella di esempio</button>
          </div>
        )}
        {phase === "closed" && (
          <div className="glass mb-6 rounded-3xl p-5 text-sm" data-testid="calendar-closed">
            <b className="font-display text-lg">Grazie per 24 giorni di gentilezza.</b>
            <p className="text-muted-foreground">Il calendario si è chiuso con la Vigilia: tutte le finestrelle restano aperte, da rileggere quando vuoi.</p>
          </div>
        )}

        <div className="advent-cabinet relative overflow-hidden" data-testid="advent">
          <Snow count={22} className="opacity-60" />
          <div className="advent-garland" aria-hidden>{Array.from({ length: 16 }).map((_, i) => <i key={i} style={{ animationDelay: `${(i % 5) * 0.6}s` }} />)}</div>
          <ul className="relative grid grid-cols-4 gap-2.5 sm:grid-cols-6 sm:gap-4 lg:grid-cols-8">
            {DOOR_ORDER.map((day, i) => {
              const door = byDay.get(day);
              const open = !!door?.message;
              const isOpened = open && opened.includes(day);
              const Motif = MOTIFS[day % MOTIFS.length]!;
              return (
                <li key={day}>
                  <button
                    type="button"
                    onClick={() => openDoor(day)}
                    aria-disabled={!open}
                    aria-label={open ? `Finestrella ${day}${isOpened ? ", già aperta" : ""}` : `Finestrella ${day}, si apre il ${day} dicembre`}
                    className={cn("advent-door", `advent-${TONES[i % TONES.length]}`, isOpened && "is-opened", !open && ready && "is-locked", day === today && "is-today")}
                    data-day={day}
                  >
                    <span className="advent-inside" aria-hidden><Motif className="h-5 w-5" /><span className="mt-1 text-[10px] font-semibold uppercase tracking-wider">Aperta</span></span>
                    <span className="advent-leaf" aria-hidden>
                      <span className="font-display text-3xl leading-none sm:text-4xl">{day}</span>
                      {!open && ready ? <Lock className="h-3.5 w-3.5 opacity-70" /> : <Motif className="h-4 w-4 opacity-80" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="mt-3 min-h-5 text-center text-sm text-gold" role="status">{hint || (phase === "open" && today ? `Oggi è il ${today} dicembre: la finestrella ${today} ti aspetta.` : "")}</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Una al giorno", d: "Dal 1 al 24 dicembre. Le finestrelle dei giorni passati restano aperte, quelle future si aprono solo quando arriva il loro giorno." },
            { t: "Gesti semplici e sicuri", d: "Piccole attenzioni per chi ci sta intorno. Se qualcuno è in difficoltà e la situazione sembra seria, la cosa giusta è chiamare il 112." },
            { t: "Anche in piazza", d: "Ogni mattina alle 10 il gesto del giorno compare sullo schermo della casetta in Piazza San Paolo." },
          ].map((x) => (
            <div key={x.t} className="glass rounded-3xl p-5"><p className="font-display text-xl">{x.t}</p><p className="mt-2 text-sm text-muted-foreground">{x.d}</p></div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auguri" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Guarda il Muro degli auguri</Link>
          <Link to="/casetta" className="glass rounded-full px-5 py-3 text-sm font-semibold">Vieni alla casetta</Link>
        </div>
      </section>

      <Modal open={!!show} onClose={() => setShow(null)}>
        {show && (
          <div className="advent-reveal pt-4 text-center" data-testid="door-message">
            {show === "example" ? (
              <>
                <span className="inline-block rounded-full border hairline-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-gold">Esempio · DEMO</span>
                <p className="mt-4 font-display text-3xl">{EXAMPLE_DOOR.title}</p>
                <p className="mt-3 text-lg leading-relaxed">{EXAMPLE_DOOR.message}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{show.day} dicembre · Gesto del giorno</p>
                <p className="mt-3 font-display text-3xl">{show.title}</p>
                <p className="mt-3 text-lg leading-relaxed">{show.message}</p>
              </>
            )}
            <p className="mt-6 text-xs text-muted-foreground">Calendario della Gentilezza · Il Natale che fa bene</p>
          </div>
        )}
      </Modal>
    </Shell>
  );
}
