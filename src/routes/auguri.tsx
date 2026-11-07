import { CAMPAIGN } from "@/lib/campaign";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PenLine, QrCode, ShieldCheck, Store } from "lucide-react";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { WishWall } from "@/components/xmas/WishWall";
import { DEMO_UNTIL, usePublicWishes, wallWishes } from "@/lib/wishes";

export const Route = createFileRoute("/auguri")({
  head: () => ({
    meta: [
      { title: "Muro degli Auguri · Il Natale che fa bene – CRI Monza" },
      { name: "description", content: "I biglietti di auguri lasciati alla casetta di Croce Rossa Italiana – Comitato di Monza in Piazza San Paolo, letti dallo staff e appesi uno accanto all'altro." },
      { property: "og:title", content: "Muro degli Auguri · Il Natale che fa bene" },
      { property: "og:description", content: "Tanti biglietti, una sola città: gli auguri di Monza appesi alla casetta CRI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auguri,
});

function Auguri() {
  const { wishes, loaded } = usePublicWishes();
  const all = wallWishes(wishes);
  const demoShown = CAMPAIGN.demo && wishes.length < DEMO_UNTIL;
  return (
    <Shell>
      <PageHead kicker="Muro degli Auguri" title={<>Tanti biglietti, <em className="text-gold">una sola città.</em></>}>
        Alla casetta di Piazza San Paolo, chi passa lascia un augurio per Monza. Ogni biglietto viene letto dallo staff e poi appeso qui, con una molletta, accanto agli altri.
      </PageHead>
      <section className="mx-auto max-w-6xl px-4">
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          {loaded ? <><b className="text-foreground">{wishes.length}</b> {wishes.length === 1 ? "augurio appeso" : "auguri appesi"}</> : "Apro il muro…"}
          {demoShown && " · i biglietti con il timbro «Esempio · DEMO» servono solo a mostrare il muro e non sono auguri veri."}
        </p>
        <WishWall wishes={all} />

        <div className="glass mt-12 rounded-[2rem] p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Come appendere il tuo augurio</p>
          <h2 className="mt-2 font-display text-3xl">Si scrive con la penna del cuore, si appende alla casetta.</h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-4">
            {[
              { I: Store, t: "Passa alla casetta", d: "In Piazza San Paolo, dal 21 novembre al 6 gennaio." },
              { I: QrCode, t: "Ricevi il tuo QR", d: "Dopo un acquisto, i volontari ti danno un codice personale per un augurio." },
              { I: PenLine, t: "Scrivi il biglietto", d: "Subito sul loro tablet o da casa entro 7 giorni. Massimo 180 caratteri." },
              { I: ShieldCheck, t: "Lo staff lo legge", d: "Solo dopo l'approvazione compare qui e sullo schermo della casetta." },
            ].map(({ I, t, d }, i) => (
              <li key={t}><span className="flex items-center gap-2 text-gold"><I className="h-5 w-5" /><span className="text-xs font-semibold">{i + 1}</span></span><p className="mt-2 font-display text-lg">{t}</p><p className="mt-1 text-sm text-muted-foreground">{d}</p></li>
            ))}
          </ol>
          <p className="mt-6 text-xs text-muted-foreground">Non serve registrarsi e non chiediamo dati personali. Gli auguri non vengono usati per pubblicità o altri scopi.</p>
          <Link to="/casetta" className="mt-5 inline-block rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Scopri la casetta</Link>
        </div>
      </section>
    </Shell>
  );
}
