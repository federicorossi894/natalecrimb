import { CAMPAIGN } from "@/lib/campaign";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Banknote } from "lucide-react";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { Snow } from "@/components/xmas/Snow";
import { GiftBox } from "@/components/xmas/GiftBox";
import { useUnwrap } from "@/hooks/use-unwrap";
import { PROJECTS, getProject } from "@/lib/data";
import { loadCashGift, type StoredCashGift } from "@/lib/cash";

export const Route = createFileRoute("/regali/")({
  head: () => ({
    meta: [
      { title: "I regali per Monza – Croce Rossa Monza" },
      { name: "description", content: "Scegli quale regalo fare a Monza: calore, un battito, prossimità o dove serve di più." },
      { property: "og:title", content: "I regali per Monza – Croce Rossa Monza" },
      { property: "og:description", content: "Quattro regali concreti per le persone che vivono a Monza." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Regali,
});

function Regali() {
  const { opening, unwrap } = useUnwrap();
  const [cash, setCash] = useState<StoredCashGift | null>(null);
  useEffect(() => setCash(CAMPAIGN.volunteerCashDonations ? loadCashGift() : null), []);
  const cashProject = cash ? getProject(cash.project) : undefined;
  return (
    <Shell>
      <PageHead kicker="Sotto l'albero" title={<>Scarta un regalo.<br /><span className="text-gold">Scopri chi aiuta.</span></>}>
        Ogni pacco è un progetto di Croce Rossa Monza. Toccane uno per aprirlo.
      </PageHead>
      {cashProject && (
        <div className="mx-auto max-w-6xl px-4">
          <Link to="/regali/$id" params={{ id: cashProject.id }} className="glass flex items-center gap-3 rounded-2xl p-4 text-sm" data-testid="cash-resume">
            <Banknote className="h-5 w-5 shrink-0 text-gold" />
            <span className="min-w-0 flex-1"><strong>Il tuo regalo in contanti · {cashProject.title}</strong><br /><span className="text-muted-foreground">{cash?.confirmed ? "Confermato alla casetta: ora puoi mandare la cartolina." : "Mostra il QR ai volontari della casetta."}</span></span>
            <ArrowRight className="h-4 w-4 text-gold" />
          </Link>
        </div>
      )}
      <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-6">
        <Snow count={25} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-10 lg:grid-cols-4">
          {PROJECTS.map((p, i) => (
            <Link key={p.id} to="/regali/$id" params={{ id: p.id }} onClick={unwrap(p.id)} className="gift-trigger group animate-rise rounded-3xl text-center outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ animationDelay: `${i * 0.08}s` }} aria-label={`Apri il regalo ${p.title}`}>
              <GiftBox project={p} open={opening === p.id} className={`mx-auto w-full max-w-[240px] transition duration-500 ${opening && opening !== p.id ? "scale-95 opacity-40" : ""}`} />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-gold">{p.kicker}</p>
              <p className="mt-1 font-display text-xl leading-tight sm:text-2xl">{p.title}</p>
              <p className="mx-auto mt-1 hidden max-w-[22ch] text-sm text-muted-foreground sm:block">{p.tagline}</p>
            </Link>
          ))}
        </div>
        {CAMPAIGN.demo && <p className="mt-16 text-center text-xs text-muted-foreground">Demo: nessun pagamento verrà effettuato.</p>}
      </section>
    </Shell>
  );
}
