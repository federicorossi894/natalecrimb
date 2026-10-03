import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { Snow } from "@/components/xmas/Snow";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { PROJECTS } from "@/lib/data";

export const Route = createFileRoute("/babbo-natale")({
  head: () => ({
    meta: [
      { title: "Prenota il tuo Babbo Natale – CRI Monza" },
      { name: "description", content: "La sera del 24 dicembre i volontari CRI vestiti da Babbo Natale portano i regali a casa. Servizio in definizione." },
      { property: "og:title", content: "Prenota il tuo Babbo Natale 🎅 – CRI Monza" },
      { property: "og:description", content: "Una sorpresa a domicilio la sera della Vigilia. Servizio in definizione." },
    ],
  }),
  component: Babbo,
});

const inp = "glass mt-1.5 w-full rounded-2xl px-4 py-3.5 outline-none focus:border-gold";

function Babbo() {
  const [done, setDone] = useState(false);
  const [proj, setProj] = useState<string | null>(null);
  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-accent-foreground">🤫 Area grandi: meglio non far leggere questa pagina ai bambini.</div>
      </div>
      <PageHead kicker="Sezione speciale · 24 dicembre" title={<>Prenota il tuo<br /><span className="text-gold">Babbo Natale 🎅</span></>}>
        <span className="mt-2 inline-block rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary">Servizio in definizione · contenuti e disponibilità da confermare</span>
      </PageHead>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary p-7 text-primary-foreground">
          <Snow count={30} />
          <p className="relative font-display text-2xl leading-snug">La sera della Vigilia, qualcuno bussa alla porta.</p>
          <ol className="relative mt-6 space-y-4 text-sm">
            <li><strong className="font-display text-lg">1.</strong> La famiglia prepara i propri regali e li consegna secondo modalità che saranno definite.</li>
            <li><strong className="font-display text-lg">2.</strong> La sera del 24 dicembre i volontari CRI, nei panni di Babbo Natale e dei suoi aiutanti, partono.</li>
            <li><strong className="font-display text-lg">3.</strong> Arrivano a casa e creano la sorpresa. Il resto lo fanno gli occhi dei bambini.</li>
          </ol>
          <p className="relative mt-6 text-xs opacity-85">Tariffe, area coperta, orari e modalità non sono ancora definiti.</p>
        </div>

        {!done ? (
          <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gold">Modulo demo · nessun dato inviato</p>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Famiglia<input className={inp} placeholder="Famiglia Rossi" /></label>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Indirizzo<input className={inp} placeholder="Via…, Monza" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bambini<input type="number" min={1} className={inp} placeholder="2" /></label>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fascia oraria
                <select className={inp} defaultValue="">
                  <option value="" disabled>Da definire</option>
                  <option>Prima fascia (demo)</option><option>Seconda fascia (demo)</option>
                </select>
              </label>
            </div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Note per Babbo Natale<textarea rows={3} className={inp} placeholder="Nomi dei bambini, curiosità…" /></label>
            <button className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">Invia richiesta (demo)</button>
          </form>
        ) : (
          <div className="animate-rise glass rounded-[2rem] p-6">
            <span className="rounded-full border hairline-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold">Demo</span>
            <p className="mt-4 font-display text-2xl">Demo – nessuna prenotazione è stata inviata.</p>
            <p className="mt-6 text-sm text-muted-foreground">Concetto futuro:</p>
            <p className="font-display text-xl">A quale progetto vuoi destinare il tuo contributo?</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {PROJECTS.map((p) => (
                <button key={p.id} onClick={() => setProj(p.id)} className={`flex flex-col items-center rounded-2xl border p-3 text-center text-sm transition ${proj === p.id ? "border-gold bg-secondary" : "glass"}`}>
                  <OrnamentIcon kind={p.ornament} className="w-10" />{p.title}
                </button>
              ))}
            </div>
            {proj && <p className="mt-4 text-sm text-gold">Ottima scelta. Nella versione reale il contributo del servizio andrà a questo progetto.</p>}
            <p className="mt-4 text-[11px] text-muted-foreground">Questo servizio vive solo in questa sezione: le normali donazioni non danno diritto alla visita di Babbo Natale.</p>
          </div>
        )}
      </section>
    </Shell>
  );
}
