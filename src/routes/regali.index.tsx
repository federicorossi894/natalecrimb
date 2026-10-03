import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { Snow } from "@/components/xmas/Snow";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { PROJECTS } from "@/lib/data";

export const Route = createFileRoute("/regali/")({
  head: () => ({
    meta: [
      { title: "I regali per Monza – Croce Rossa Monza" },
      { name: "description", content: "Scegli quale regalo fare a Monza: calore, un battito, prossimità o dove serve di più." },
      { property: "og:title", content: "I regali per Monza – Croce Rossa Monza" },
      { property: "og:description", content: "Quattro regali concreti per le persone che vivono a Monza." },
    ],
  }),
  component: Regali,
});

const POS = ["sm:translate-y-0", "sm:translate-y-16", "sm:-translate-y-4", "sm:translate-y-12"];
const BOX = ["bg-primary", "bg-fir", "bg-gold text-accent-foreground", "bg-snow text-ink"];

function Regali() {
  return (
    <Shell>
      <PageHead kicker="Sotto l'albero" title={<>Scarta un regalo.<br /><span className="text-gold">Scopri chi aiuta.</span></>}>
        Ogni pacco è un progetto reale di Croce Rossa Monza. Scegli quello che ti tocca di più.
      </PageHead>
      <section className="relative mx-auto max-w-6xl px-4 pb-24">
        <Snow count={25} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
          {PROJECTS.map((p, i) => (
            <Link key={p.id} to="/regali/$id" params={{ id: p.id }} className={`group animate-rise ${POS[i]}`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="relative mx-auto aspect-square w-full max-w-[220px] transition duration-500 group-hover:-translate-y-2 group-hover:rotate-[-2deg]">
                <div className={`absolute inset-x-[6%] bottom-0 top-[22%] rounded-xl shadow-deep ${BOX[i]}`}>
                  <div className="absolute inset-y-0 left-1/2 w-[14%] -translate-x-1/2 bg-gold/90" />
                </div>
                <div className={`absolute inset-x-0 top-[14%] h-[16%] rounded-lg shadow-deep transition duration-500 group-hover:-translate-y-4 group-hover:-rotate-6 ${BOX[i]}`} style={{ filter: "brightness(1.08)" }}>
                  <div className="absolute inset-y-0 left-1/2 w-[14%] -translate-x-1/2 bg-gold" />
                </div>
                <div className="absolute left-1/2 top-[2%] h-[16%] w-[40%] -translate-x-1/2 rounded-full border-[5px] border-gold transition duration-500 group-hover:-translate-y-4" />
                <div className="absolute left-1/2 top-[36%] w-[40%] -translate-x-1/2 opacity-0 transition duration-500 group-hover:-translate-y-10 group-hover:opacity-100">
                  <OrnamentIcon kind={p.ornament} className="w-full drop-shadow-xl" />
                </div>
              </div>
              <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">{p.kicker}</p>
              <p className="text-center font-display text-xl sm:text-2xl">{p.title}</p>
            </Link>
          ))}
        </div>
        <p className="mt-24 text-center text-xs text-muted-foreground">Demo: nessun pagamento verrà effettuato.</p>
      </section>
    </Shell>
  );
}
