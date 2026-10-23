import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Gift } from "lucide-react";
import hero from "@/assets/hero-piazza.jpg";
import { Shell } from "@/components/xmas/Shell";
import { Snow } from "@/components/xmas/Snow";
import { GiftBox } from "@/components/xmas/GiftBox";
import { useUnwrap } from "@/hooks/use-unwrap";
import { SantaChimneySection } from "@/components/xmas/SantaChimney";
import { PROJECTS } from "@/lib/data";
import { CASETTA } from "@/lib/casetta";
import { CasettaPoster } from "@/components/xmas/CasettaMedia";
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
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setOpen(true), 250), b = setTimeout(onDone, 1250);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [onDone]);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/90 backdrop-blur-md">
      <GiftBox project={PROJECTS[0]!} open={open} className="animate-rise w-56" />
    </div>
  );
}

function Home() {
  const [opening, setOpening] = useState(false);
  const nav = useNavigate();
  const { opening: unwrapping, unwrap } = useUnwrap();
  const toGifts = useCallback(() => nav({ to: "/regali" }), [nav]);
  return (
    <Shell>
      {opening && <GiftOpening onDone={toGifts} />}
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
            Scegli una causa e dona a Croce Rossa Italiana — Comitato di Monza, anche con 5 €. Il tuo gesto diventa un addobbo sull’Albero di Monza: puoi dedicarlo a chi vuoi.
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
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-10 lg:grid-cols-4">
          {PROJECTS.map((p) => (
            <Link key={p.id} to="/regali/$id" params={{ id: p.id }} onClick={unwrap(p.id)} className="gift-trigger group rounded-3xl text-center outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Apri il regalo ${p.title}`}>
              <GiftBox project={p} open={unwrapping === p.id} className="mx-auto w-full max-w-[210px]" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-gold">{p.kicker}</p>
              <p className="mt-1 font-display text-xl leading-tight sm:text-2xl">{p.title}</p>
            </Link>
          ))}
        </div>
        <ol className="mt-14 grid gap-3 sm:grid-cols-3">
          {[
            { n: "1", t: "Scegli un regalo", d: "Quattro progetti di Croce Rossa Monza." },
            { n: "2", t: "Dona in pochi tocchi", d: "Bastano 5 €. Online o alla casetta." },
            { n: "3", t: "Accendi l'Albero di Monza", d: "Il tuo regalo diventa un addobbo. Puoi dedicarlo a chi vuoi." },
          ].map((s) => (
            <li key={s.n} className="glass flex items-start gap-4 rounded-2xl p-5">
              <span className="font-display text-4xl leading-none text-gold">{s.n}</span>
              <span><span className="block font-display text-lg">{s.t}</span><span className="text-sm text-muted-foreground">{s.d}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="glass grid gap-6 overflow-hidden rounded-[2rem] p-6 sm:grid-cols-2 sm:p-10">
          <div className="flex items-start gap-5">
            {/* Official poster appears here only once the original file is attached; nothing is drawn in its place. */}
            <CasettaPoster placeholder={false} className="w-28 shrink-0 sm:w-36" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">La casetta di Natale · dal {CASETTA.from} al {CASETTA.until}</p>
              <h3 className="mt-3 font-display text-3xl">Vieni a trovarci alla casetta in Piazza San Paolo.</h3>
              <p className="mt-3 text-muted-foreground">Cioccolato, tisane, regali e panettone. Il Natale ha un sapore ancora più buono quando lo condividi.</p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                <Link to="/casetta" className="inline-flex items-center gap-2 font-semibold text-gold">Sapori e regali solidali <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/piazza" className="inline-flex items-center gap-2 font-semibold text-foreground/80">Cosa succede oggi <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
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
