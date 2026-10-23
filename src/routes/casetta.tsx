import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Heart, MapPin, Store, Users } from "lucide-react";
import { Shell } from "@/components/xmas/Shell";
import { CasettaPhoto, CasettaPoster } from "@/components/xmas/CasettaMedia";
import { CASETTA, CASETTA_PRODUCTS, formatEuro } from "@/lib/casetta";

export const Route = createFileRoute("/casetta")({
  head: () => ({
    meta: [
      { title: "La casetta di Natale · Sapori e regali solidali – CRI Monza" },
      { name: "description", content: "Panettone, pandoro e cioccolatini alla casetta di Croce Rossa Italiana – Comitato di Monza in Piazza San Paolo, dal 21 novembre al 6 gennaio. Vendita solo alla casetta." },
      { property: "og:title", content: "La casetta di Natale · Sapori e regali solidali" },
      { property: "og:description", content: "Il Natale ha un sapore ancora più buono quando lo condividi. Ti aspettiamo in Piazza San Paolo, Monza." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Casetta,
});

function VisitCta({ className = "" }: { className?: string }) {
  return (
    <a href={CASETTA.mapsUrl} target="_blank" rel="noopener noreferrer"
      className={`group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-deep transition hover:scale-[1.02] ${className}`}>
      <MapPin className="h-4 w-4" /> Vieni a trovarci in Piazza San Paolo
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
    </a>
  );
}

function Casetta() {
  return (
    <Shell>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-8 pt-10 sm:pt-16 md:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">La casetta di Natale · Sapori e regali solidali</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] sm:text-6xl">
            Il Natale ha un sapore ancora più buono <em className="text-gold">quando lo condividi.</em>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-foreground/85">
            Alla casetta di Croce Rossa Italiana – Comitato di Monza trovi cioccolato, tisane, regali e panettone. Passa a scegliere un pensiero per le feste e a conoscere i nostri volontari.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-gold" /> Dal {CASETTA.from} al {CASETTA.until}</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-gold" /> {CASETTA.place}</li>
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <VisitCta />
            <Link to="/piazza" className="glass rounded-full px-5 py-3.5 text-sm font-medium">Cosa succede oggi</Link>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[360px]">
          <CasettaPoster />
        </div>
      </section>

      {/* Storytelling inspired by CRI national Christmas pages; no supplier, ingredient or use-of-funds claims. */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="glass rounded-[2rem] p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Più di un dolce</p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl sm:text-4xl">Una vetrina solidale nel cuore di Monza.</h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Heart, t: "Un gesto di dolcezza", d: "Scegliere un panettone o una latta di cioccolatini alla casetta è un modo semplice per portare in tavola la festa e, insieme, un pensiero di solidarietà." },
              { icon: Users, t: "Un incontro", d: "La casetta non è un negozio: è un piccolo presidio di Croce Rossa in piazza, dove fermarsi, fare due chiacchiere con i volontari e scoprire cosa fanno ogni giorno a Monza." },
              { icon: Store, t: "Solo in Piazza San Paolo", d: `Dal ${CASETTA.from} al ${CASETTA.until}, esclusivamente alla casetta. Nessun acquisto né prenotazione online.` },
            ].map(({ icon: I, t, d }) => (
              <li key={t}>
                <I className="h-6 w-6 text-gold" aria-hidden />
                <h3 className="mt-3 font-display text-xl">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Da portare a casa</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">I dolci delle feste</h2>
          </div>
          <p className="inline-flex items-center gap-2 rounded-full border hairline-gold px-4 py-2 text-xs font-semibold text-gold">
            <Store className="h-4 w-4" /> In vendita solo alla casetta, non sul sito
          </p>
        </div>

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="casetta-products">
          {CASETTA_PRODUCTS.map((p) => (
            <li key={p.id} className="glass flex flex-col rounded-3xl p-3">
              <CasettaPhoto slot={p.photo} label={p.name} />
              <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-xl leading-tight">{p.name}</h3>
                  <span className="shrink-0 font-display text-2xl text-gold" data-testid="casetta-price">{formatEuro(p.price)}</span>
                </div>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.format}</p>
                <p className="mt-3 text-sm text-foreground/85">{p.blurb}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="glass mt-10 grid gap-6 rounded-[2rem] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl">Ti aspettiamo in Piazza San Paolo</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Dal {CASETTA.from} al {CASETTA.until}, i dolci delle feste si trovano esclusivamente alla casetta di Croce Rossa Italiana – Comitato di Monza. Sul sito non si acquista e non si prenota: si sceglie di persona, insieme a cioccolato, tisane e regali, e intanto si conoscono i volontari.
            </p>
          </div>
          <VisitCta />
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">Prezzi indicati dal Comitato · nessun ordine, pagamento o prenotazione online.</p>
      </section>
    </Shell>
  );
}
