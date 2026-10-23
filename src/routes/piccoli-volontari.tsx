import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Award, CheckCircle2, Clock, Lock, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/xmas/Shell";
import { Snow } from "@/components/xmas/Snow";
import hero from "@/assets/kids/academy-hero.jpg";
import cold from "@/assets/kids/scene-cold.jpg";
import battito from "@/assets/kids/scene-battito.jpg";
import { HelperProvider, useAcademy } from "@/components/kids/Kit";
import { Backpack, HelperBadge, Medal } from "@/components/kids/KidsArt";
import { MissionCity } from "@/components/kids/MissionCity";
import { MissionZaino } from "@/components/kids/MissionZaino";
import { MissionBattito } from "@/components/kids/MissionBattito";
import { DiplomaView } from "@/components/kids/Diploma";
import { HELPERS, MISSIONS, canOpenDiploma, completeMission, type MissionId } from "@/lib/kids-academy";

type View = MissionId | "diploma";
const VIEWS: View[] = ["citta", "zaino", "battito", "diploma"];

export const Route = createFileRoute("/piccoli-volontari")({
  head: () => ({
    meta: [
      { title: "Accademia dei piccoli aiutanti di Babbo Natale – CRI Monza" },
      { name: "description", content: "Tre missioni illustrate per bambini dai 6 ai 12 anni: accorgersi di chi ha bisogno, preparare lo zaino per la neve e allenare il ritmo del cuore. Poi il diploma da mostrare alla casetta." },
      { property: "og:title", content: "Accademia dei piccoli aiutanti di Babbo Natale" },
      { property: "og:description", content: "Tre missioni per imparare ad aiutare, e un diploma da mostrare ai volontari in Piazza San Paolo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { missione?: View } =>
    VIEWS.includes(s["missione"] as View) ? { missione: s["missione"] as View } : {},
  component: Academy,
});

const THUMB: Record<MissionId, React.ReactNode> = {
  citta: <img src={cold} alt="" width={1280} height={800} loading="lazy" className="h-full w-full object-cover" />,
  zaino: <div className="flex h-full items-end justify-center bg-[radial-gradient(ellipse_at_50%_30%,var(--kid-sky-deep),var(--scene-night))] pt-3"><Backpack packed={["torcia", "berretto", "telefono"]} className="h-[92%]" /></div>,
  battito: <img src={battito} alt="" width={1280} height={800} loading="lazy" className="h-full w-full object-cover" />,
};

function Academy() {
  const { missione } = Route.useSearch();
  const navigate = useNavigate({ from: "/piccoli-volontari" });
  const { state, update, ready } = useAcademy();
  const [sound, setSound] = useState(false); // sound is always off until the child turns it on
  const go = (v?: View) => { void navigate({ search: v ? { missione: v } : {} }); window.scrollTo({ top: 0 }); };
  const complete = (id: MissionId) => {
    // Random bytes and time are drawn once, outside the state updater, so the updater stays pure.
    const bytes = crypto.getRandomValues(new Uint8Array(6)), now = new Date();
    update((s) => completeMission(s, id, now, bytes));
  };
  const common = { sound, setSound, onExit: () => go(), onDiploma: () => go("diploma") };

  let body: React.ReactNode;
  if (missione === "citta") body = <MissionCity {...common} onComplete={() => complete("citta")} />;
  else if (missione === "zaino") body = <MissionZaino {...common} onComplete={() => complete("zaino")} />;
  else if (missione === "battito") body = <MissionBattito {...common} onComplete={() => complete("battito")} />;
  else if (missione === "diploma" && ready && canOpenDiploma(state)) body = <DiplomaView state={state} update={update} onExit={() => go()} />;
  else body = <Hub state={state} update={update} go={go} />;
  // The guide picked in the hub speaks the feedback in every mission (device-only choice, no personal data).
  return <Shell hidePiazzaPill={!!missione}><HelperProvider helper={state.helper ?? "stella"}><div className="pb-28">{body}</div></HelperProvider></Shell>;
}

function Hub({ state, update, go }: { state: ReturnType<typeof useAcademy>["state"]; update: ReturnType<typeof useAcademy>["update"]; go: (v?: View) => void }) {
  const unlocked = canOpenDiploma(state);
  return (
    <>
      <section className="relative mx-auto max-w-6xl px-4 pt-5">
        <div className="relative overflow-hidden rounded-[2rem] border hairline-gold shadow-deep">
          <img src={hero} alt="Bambini arrivano all'Accademia, una casetta illuminata nella piazza innevata" width={1600} height={912} className="kid-drift aspect-[4/5] w-full object-cover sm:aspect-[16/8]" />
          <Snow count={26} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Area bambini · 6–12 anni</p>
            <h1 className="mt-2 font-display text-4xl leading-[1.05] text-glow sm:text-6xl">Accademia dei piccoli aiutanti<br /><em className="text-gold">di Babbo Natale</em></h1>
            <p className="mt-3 max-w-xl text-lg">Tre missioni per imparare ad aiutare. Completane almeno una e ricevi il diploma da mostrare alla casetta di Croce Rossa!</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-8">
        <h2 className="font-display text-2xl">Scegli il tuo aiutante</h2>
        <p className="text-sm text-muted-foreground">Comparirà sul tuo diploma. Non serve scrivere il nome.</p>
        <div className="mt-3 flex flex-wrap gap-3" role="radiogroup" aria-label="Aiutante del diploma">
          {HELPERS.map((h) => {
            const on = (state.helper ?? "stella") === h.id;
            return (
              <button key={h.id} type="button" role="radio" aria-checked={on} onClick={() => update((s) => ({ ...s, helper: h.id }))}
                className={`flex min-h-14 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 font-semibold transition ${on ? "border-gold bg-secondary" : "glass"}`}>
                <HelperBadge id={h.id} className="h-11 w-11" /> {h.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 pt-8 md:grid-cols-3" aria-label="Missioni">
        {MISSIONS.map((m) => {
          const ok = state.done.includes(m.id);
          return (
            <button key={m.id} type="button" onClick={() => go(m.id)} className="group overflow-hidden rounded-[1.75rem] border hairline-gold bg-card text-left shadow-deep transition hover:-translate-y-1" data-testid={`mission-${m.id}`}>
              <div className="relative aspect-[16/10] overflow-hidden">
                {THUMB[m.id]}
                <span className="absolute left-3 top-3 rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink">Missione {m.n}</span>
                {ok && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-bold text-ink"><CheckCircle2 className="h-4 w-4" /> Completata</span>}
              </div>
              <div className="p-5">
                <h3 className="font-display text-2xl leading-tight">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.teaser}</p>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                  <span className="text-gold">{m.age}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {m.minutes}</span>
                </div>
                <span className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground">{ok ? "Gioca di nuovo" : "Inizia"} <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></span>
              </div>
            </button>
          );
        })}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-8">
        <div className={`flex flex-col items-center gap-5 rounded-[2rem] p-6 text-center sm:flex-row sm:text-left ${unlocked ? "bg-paper text-ink" : "border border-dashed hairline-gold"}`} data-testid="diploma-card">
          <div className="flex -space-x-4">{MISSIONS.map((m) => <Medal key={m.id} mission={m.id} earned={state.done.includes(m.id)} className="h-20 w-20" />)}</div>
          <div className="flex-1">
            <h2 className="font-display text-2xl">Diploma di Piccolo Aiutante</h2>
            <p className={`mt-1 ${unlocked ? "" : "text-muted-foreground"}`}>{unlocked ? "Il tuo diploma è pronto! Mostralo ai volontari della casetta in Piazza San Paolo." : "Completa almeno una missione per sbloccarlo."}</p>
          </div>
          {unlocked
            ? <button type="button" onClick={() => go("diploma")} className="inline-flex min-h-14 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground"><Award className="h-5 w-5" /> Apri il diploma</button>
            : <span className="inline-flex min-h-14 items-center gap-2 rounded-full bg-muted px-6 font-semibold text-muted-foreground"><Lock className="h-5 w-5" /> Bloccato</span>}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-6">
        <div className="flex gap-3 rounded-3xl bg-card p-5 text-sm leading-relaxed">
          <ShieldCheck className="h-6 w-6 shrink-0 text-gold" />
          <p><strong>Per i genitori.</strong> Nessuna registrazione, nessun dato del bambino, nessuna pubblicità. I progressi restano solo su questo dispositivo. Le missioni insegnano ad accorgersi, a chiamare un adulto e il 112: non sostituiscono un corso di primo soccorso. I suoni sono spenti finché non li accendete.</p>
        </div>
      </section>
    </>
  );
}
