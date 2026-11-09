import { CAMPAIGN } from "@/lib/campaign";
import { ONLINE_GIFT } from "@/lib/site-experience";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CalendarDays, Candy, Coffee, Gift, Heart, Lightbulb, LightbulbOff, MapPin, PenLine, Sparkles, Store, Users, CakeSlice } from "lucide-react";
import { Shell } from "@/components/xmas/Shell";
import { Snow } from "@/components/xmas/Snow";
import { CasettaPhoto, CasettaPoster } from "@/components/xmas/CasettaMedia";
import { CASETTA, CASETTA_PRODUCTS, formatEuro } from "@/lib/casetta";
import { cn } from "@/lib/utils";

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

const BULB_COLORS = ["var(--gold)", "var(--scene-red)", "var(--scene-snow)", "var(--scene-needle)"];
const BULBS = Array.from({ length: 18 }, (_, i) => {
  const x = (i + 0.5) / 18;
  const t = (x * 3) % 1;
  return { x: x * 100, y: 6 + 4 * t * (1 - t) * 30, c: BULB_COLORS[i % 4]!, d: `${(i % 6) * 0.5}s` };
});

/** Decorative string of lights; one accessible switch, plus a playful "ping" when a bulb is touched. */
function StringLights() {
  const [lit, setLit] = useState(true);
  const [ping, setPing] = useState<number | null>(null);
  const touch = (i: number) => { setPing(i); setTimeout(() => setPing((p) => (p === i ? null : p)), 450); };
  return (
    <>
      <div className={cn("casetta-lights", lit && "is-lit")} aria-hidden>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
          <path d={`M0 6 ${BULBS.map((b) => `L${b.x} ${b.y - 2}`).join(" ")} L100 6`} fill="none" stroke="var(--fir-deep)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        </svg>
        {BULBS.map((b, i) => (
          <span key={i} className={cn("casetta-bulb", ping === i && "is-ping")} onPointerEnter={() => touch(i)} onPointerDown={() => touch(i)}
            style={{ left: `${b.x}%`, top: `${(b.y / 40) * 70}px`, ["--bulb" as string]: b.c, ["--d" as string]: b.d }} />
        ))}
      </div>
      <button type="button" onClick={() => setLit(!lit)} aria-pressed={lit} className="absolute right-4 top-[4.4rem] z-10 inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs" data-testid="lights-toggle">
        {lit ? <LightbulbOff className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5 text-gold" />}{lit ? "Spegni le luci" : "Accendi le luci"}
      </button>
    </>
  );
}

const OFFER_ICON = { Cioccolato: Candy, Tisane: Coffee, Regali: Gift, Panettone: CakeSlice } as const;

function HangingSign({ label, i }: { label: string; i: number }) {
  const [swing, setSwing] = useState(false);
  const I = OFFER_ICON[label as keyof typeof OFFER_ICON] ?? Sparkles;
  return (
    <li className={cn("casetta-sign", swing && "is-swing")} style={{ ["--d" as string]: `${i * 0.7}s` }}
      onClick={() => { setSwing(false); requestAnimationFrame(() => setSwing(true)); }} onAnimationEnd={() => setSwing(false)}>
      <span className="casetta-sign-rope" aria-hidden />
      <span className="casetta-sign-board flex items-center gap-2"><I className="h-4 w-4 text-gold" aria-hidden />{label}</span>
    </li>
  );
}

const TAG_TILT = [-1.2, 1, -0.8, 1.3];

/** One product on the counter: original photo on a white stage, wooden shelf, ivory tag on twine (swings when touched). */
function StallItem({ p, i }: { p: (typeof CASETTA_PRODUCTS)[number]; i: number }) {
  const [swing, setSwing] = useState(false);
  return (
    <li className={cn("stall-item", swing && "is-swing")} onPointerDown={() => { setSwing(true); setTimeout(() => setSwing(false), 700); }}>
      <CasettaPhoto slot={p.photo} label={p.name} className="stall-goods" />
      <span className="stall-plank" aria-hidden />
      <div className="stall-tag" style={{ ["--tilt" as string]: `${TAG_TILT[i % 4]}deg` }}>
        <h3 className="font-display text-lg leading-tight sm:text-xl">{p.name}</h3>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink/65">{p.format}</p>
        <p className="stall-price mt-2"><span data-testid="casetta-price">{formatEuro(p.price)}</span></p>
        <p className="mt-2 text-xs leading-snug text-ink/80 sm:text-[13px]">{p.blurb}</p>
      </div>
    </li>
  );
}

const STALL_LIGHTS = Array.from({ length: 14 }, (_, i) => `${(i % 5) * 0.8}s`);

function Casetta() {
  if (ONLINE_GIFT) return <OnlineCasetta />;
  return (
    <Shell>
      <section className="relative isolate overflow-hidden">
        <Snow count={28} className="opacity-70" />
        <StringLights />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-8 pt-28 sm:pt-32 md:grid-cols-[1.15fr_0.85fr]">
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
          {/* The official poster sits inside a wooden shop-window frame; the image itself is untouched. */}
          <div className="shop-window mx-auto w-full max-w-[360px]">
            <CasettaPoster className="relative rounded-2xl" />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Cosa trovi alla casetta</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-3" data-testid="casetta-offering">
            {CASETTA.offering.map((o, i) => <HangingSign key={o} label={o} i={i} />)}
          </ul>
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

      <section className="mx-auto max-w-6xl px-4 pt-14" aria-labelledby="stall-title">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Sul banco della casetta</p>
        <h2 id="stall-title" className="mt-2 font-display text-3xl sm:text-4xl">I dolci delle feste</h2>

        <div className="stall mt-6">
          <span className="stall-awning" aria-hidden />
          <div className="stall-lights" aria-hidden>
            {STALL_LIGHTS.map((d, i) => <span key={i} style={{ ["--d" as string]: d }} />)}
          </div>
          <ul className="stall-shelf" data-testid="casetta-products">
            {CASETTA_PRODUCTS.map((p, i) => <StallItem key={p.id} p={p} i={i} />)}
          </ul>
          <p className="mt-7 flex items-center justify-center gap-2 text-center text-sm text-snow/90">
            <Store className="h-4 w-4 shrink-0 text-gold" aria-hidden />
            Prezzi indicati dal Comitato · si scelgono e si acquistano solo alla casetta
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Il tuo giro alla casetta</p>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { I: MapPin, t: "Vieni in piazza", d: `Piazza San Paolo, dal ${CASETTA.from} al ${CASETTA.until}.` },
            { I: Gift, t: "Scegli il tuo pensiero", d: "Dolci, tisane e regali, scelti di persona con i volontari." },
            ...(CAMPAIGN.volunteerPurchaseWishQR ? [{ I: PenLine, t: "Lascia un augurio", d: "Dopo l'acquisto puoi chiedere il QR per appendere un biglietto sul Muro degli Auguri." }] : []),
          ].map(({ I, t, d }, i) => (
            <li key={t} className="glass relative rounded-3xl p-5">
              <span className="absolute right-5 top-4 font-display text-4xl text-gold/30" aria-hidden>{i + 1}</span>
              <I className="h-6 w-6 text-gold" aria-hidden />
              <p className="mt-3 font-display text-xl">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-3">
          {CAMPAIGN.publicWishWall && <Link to="/auguri" className="inline-flex items-center gap-2 text-sm font-semibold text-gold">Guarda il Muro degli Auguri <ArrowRight className="h-4 w-4" /></Link>}
          <Link to="/calendario" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/80">Calendario della Gentilezza <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <div className="glass mt-10 grid gap-6 rounded-[2rem] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl">Ti aspettiamo in Piazza San Paolo</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Dal {CASETTA.from} al {CASETTA.until} alla casetta di Croce Rossa Italiana – Comitato di Monza. Sul sito non si acquista e non si prenota: si sceglie di persona, insieme a cioccolato, tisane e regali, e intanto si conoscono i volontari.
            </p>
          </div>
          <VisitCta />
        </div>
      </section>
    </Shell>
  );
}

/** Informational ONLINE_GIFT window; the original FULL page above stays intact. */
function OnlineCasetta() {
  return (
    <Shell>
      <section className="relative isolate overflow-hidden">
        <Snow count={28} className="opacity-70" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-8 pt-12 sm:pt-16 md:grid-cols-[1.15fr_0.85fr]">
          <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Sapori e regali solidali</p>
          <h1 className="mt-3 font-display text-4xl leading-tight sm:text-6xl">La casetta di Natale</h1>
          <p className="mt-5 max-w-2xl text-lg text-foreground/85">Il Natale ha un sapore ancora più buono quando lo condividi. Una vetrina di dolci e pensieri solidali di Croce Rossa Italiana – Comitato di Monza.</p>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">Cioccolato, tisane, regali e panettone. I prodotti si scelgono e si acquistano di persona alla casetta: nessun acquisto o prenotazione online.</p>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-gold" /> Dal {CASETTA.from} al {CASETTA.until}</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-gold" /> {CASETTA.place}</li>
          </ul>
          <div className="mt-6"><VisitCta /></div>
          </div>
          <div className="shop-window mx-auto w-full max-w-[360px]"><CasettaPoster className="relative rounded-2xl" /></div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4" aria-labelledby="online-stall-title">
        <h2 id="online-stall-title" className="font-display text-3xl sm:text-4xl">I dolci delle feste</h2>
        <div className="stall mt-6">
          <span className="stall-awning" aria-hidden />
          <div className="stall-lights" aria-hidden>{STALL_LIGHTS.map((d, i) => <span key={i} style={{ ["--d" as string]: d }} />)}</div>
          <ul className="stall-shelf" data-testid="casetta-products">{CASETTA_PRODUCTS.map((p, i) => <StallItem key={p.id} p={p} i={i} />)}</ul>
          <p className="mt-7 text-center text-sm text-snow/90">Prezzi indicati dal Comitato · vendita solo alla casetta</p>
        </div>
        <div className="mt-10 border-t border-border pt-8">
          <h2 className="font-display text-2xl">Regala un gesto solidale</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Scegli uno dei quattro progetti CRI Monza e dedica una pallina sull’albero digitale. In questa DEMO il pagamento è soltanto simulato.</p>
          <Button asChild className="mt-5 rounded-full"><Link to="/regali"><Gift className="h-4 w-4" /> Regala a qualcuno <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </section>
    </Shell>
  );
}
