import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Gift } from "lucide-react";
import hero from "@/assets/hero-piazza.jpg";
import { Shell } from "@/components/xmas/Shell";
import { Snow } from "@/components/xmas/Snow";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { SantaChimneySection } from "@/components/xmas/SantaChimney";
import { PROJECTS } from "@/lib/data";
import { Button } from '@/components/ui/button';

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Il Natale che fa bene – Croce Rossa Monza" },
      { name: "description", content: "Questo Natale, scegli cosa regalare a Monza. Demo della campagna natalizia di Croce Rossa Italiana – Comitato di Monza, Piazza San Paolo." },
      { property: "og:title", content: "Il Natale che fa bene – Croce Rossa Monza" },
      { property: "og:description", content: "Scegli un regalo concreto per le persone che vivono a Monza." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function GiftOpening({ onDone }: { onDone: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/90 backdrop-blur-md" onAnimationEnd={(e) => e.animationName === "box-pop" && onDone()}>
      <div className="relative h-44 w-44" style={{ animation: "box-pop 1.5s cubic-bezier(.2,.8,.2,1) forwards" }}>
        <div className="absolute inset-0 rounded-full bg-gold/30" style={{ animation: "burst 1.2s 0.6s ease-out both" }} />
        <div className="absolute bottom-0 left-[10%] h-[62%] w-[80%] rounded-md bg-primary shadow-deep">
          <div className="absolute inset-y-0 left-1/2 w-[14%] -translate-x-1/2 bg-gold" />
        </div>
        <div className="absolute left-[4%] top-[24%] h-[18%] w-[92%] rounded-md bg-primary shadow-deep" style={{ animation: "lid-open 1s 0.45s ease-in forwards", filter: "brightness(1.1)" }}>
          <div className="absolute inset-y-0 left-1/2 w-[14%] -translate-x-1/2 bg-gold" />
          <div className="absolute -top-6 left-1/2 h-8 w-16 -translate-x-1/2 rounded-full border-[6px] border-gold" />
        </div>
      </div>
    </div>
  );
}

function Home() {
  const [opening, setOpening] = useState(false);
  const nav = useNavigate();
  return (
    <Shell>
      {opening && <GiftOpening onDone={() => nav({ to: "/regali" })} />}
      <section className="relative isolate -mt-px min-h-[74svh] overflow-hidden">
        <img src={hero} alt="Piazza di Monza illuminata per Natale" width={1088} height={1440} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/30 to-background" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/80 via-background/20 to-transparent" />
        <Snow count={50} />
        <div className="mx-auto flex min-h-[74svh] max-w-6xl flex-col justify-end px-5 pb-20 pt-16 sm:justify-center">
          <p className="animate-rise text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Croce Rossa Italiana – Comitato di Monza · Piazza San Paolo</p>
          <h1 className="animate-rise mt-4 max-w-2xl font-display text-[2.9rem] leading-[0.98] sm:text-7xl" style={{ animationDelay: "0.1s" }}>
            Questo Natale, scegli cosa <em className="text-gold not-italic">regalare</em> a Monza.
          </h1>
          <p className="animate-rise mt-5 max-w-md text-lg text-foreground/85" style={{ animationDelay: "0.2s" }}>
            Non un regalo simbolico. Un aiuto concreto alle persone che vivono qui.
          </p>
          <div className="animate-rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.3s" }}>
            <Button onClick={() => setOpening(true)} className="group h-auto rounded-full px-7 py-4 text-base shadow-deep transition hover:scale-[1.03]">
              <Gift className="h-5 w-5" /> Scarta i regali
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Button>
            <Link to="/albero" className="glass rounded-full px-5 py-4 text-sm font-medium">L'Albero di Monza</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Quattro regali, una città</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl sm:text-5xl">Ogni regalo diventa un addobbo sull'Albero di Monza.</h2>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROJECTS.map((p, i) => (
            <Link key={p.id} to="/regali/$id" params={{ id: p.id }} className={`glass group relative overflow-hidden rounded-3xl p-5 transition hover:-translate-y-1 ${i % 2 ? "lg:mt-10" : ""}`}>
              <OrnamentIcon kind={p.ornament} className="animate-floaty h-20 w-20" />
              <p className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">{p.kicker}</p>
              <p className="mt-1 font-display text-2xl">{p.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
              <ArrowRight className="mt-4 h-5 w-5 text-gold transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="glass grid gap-6 overflow-hidden rounded-[2rem] p-6 sm:grid-cols-2 sm:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Villaggio di Natale · 40 giorni</p>
            <h3 className="mt-3 font-display text-3xl">Vieni a trovarci alla casetta in Piazza San Paolo.</h3>
            <p className="mt-3 text-muted-foreground">Mercatino solidale, panettoni e biscotti, controlli di pressione e glicemia, dimostrazioni di manovre salvavita.</p>
            <Link to="/piazza" className="mt-6 inline-flex items-center gap-2 font-semibold text-gold">Cosa succede oggi <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <Link to="/albero" className="relative rounded-3xl bg-primary p-6 text-primary-foreground">
            <p className="text-xs uppercase tracking-widest opacity-80">Il cuore della campagna</p>
            <p className="mt-2 font-display text-3xl">Fai crescere l'Albero di Monza</p>
            <p className="mt-2 text-sm opacity-90">Ogni regalo aggiunge una luce, un ramo, una storia.</p>
            <ArrowRight className="mt-6 h-5 w-5" />
          </Link>
        </div>
      </section>

      <SantaChimneySection />
    </Shell>
  );
}
