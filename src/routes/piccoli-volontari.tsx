import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { Snow } from "@/components/xmas/Snow";
import { CriMark } from "@/components/xmas/Ornament";

export const Route = createFileRoute("/piccoli-volontari")({
  head: () => ({
    meta: [
      { title: "Piccoli volontari di Babbo Natale – CRI Monza" },
      { name: "description", content: "Un mini-quiz per i più piccoli: completa la missione e mostrala ai volontari della casetta." },
      { property: "og:title", content: "Piccoli volontari di Babbo Natale" },
      { property: "og:description", content: "Tre domande, una missione. Per i bambini che passano in Piazza San Paolo." },
    ],
  }),
  component: Kids,
});

const Q = [
  { q: "Se vedi qualcuno che si sente male, cosa fai per prima cosa?", a: ["Scappo via", "Chiamo un adulto e il 112", "Gli do una caramella"], ok: 1 },
  { q: "Che colore ha la croce della Croce Rossa?", a: ["Rossa", "Verde", "Blu"], ok: 0 },
  { q: "Cosa ci tiene al caldo d'inverno?", a: ["Un ghiacciolo", "Una coperta", "Un ventilatore"], ok: 1 },
];

function Kids() {
  const [i, setI] = useState(-1);
  const [wrong, setWrong] = useState<number | null>(null);
  return (
    <Shell>
      <PageHead kicker="Area bambini" title={<>Piccoli volontari<br /><span className="text-gold">di Babbo Natale</span></>} />
      <section className="mx-auto max-w-lg px-4">
        <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-fir-deep p-6">
          <Snow count={30} />
          {i === -1 && (
            <div className="relative text-center">
              <p className="mt-8 text-6xl">🧝</p>
              <p className="mt-4 font-display text-2xl">Babbo Natale ha bisogno di aiutanti!</p>
              <p className="mt-2 text-muted-foreground">Rispondi a 3 domande e diventa un piccolo volontario.</p>
              <button onClick={() => setI(0)} className="mt-8 rounded-full bg-primary px-8 py-4 font-semibold text-primary-foreground">Inizia la missione</button>
            </div>
          )}
          {i >= 0 && i < Q.length && (
            <div key={i} className="animate-rise relative">
              <p className="text-xs uppercase tracking-widest text-gold">Domanda {i + 1} di 3</p>
              <p className="mt-3 font-display text-2xl leading-snug">{Q[i].q}</p>
              <div className="mt-6 space-y-2">
                {Q[i].a.map((a, j) => (
                  <button key={a} onClick={() => (j === Q[i].ok ? (setWrong(null), setI(i + 1)) : setWrong(j))} className={`glass w-full rounded-2xl p-4 text-left text-lg transition ${wrong === j ? "border-primary" : ""}`}>
                    {a}
                  </button>
                ))}
              </div>
              {wrong !== null && <p className="mt-3 text-sm text-gold">Quasi! Riprova 🙂</p>}
            </div>
          )}
          {i === Q.length && (
            <div className="animate-rise relative text-center">
              <CriMark className="mx-auto mt-4 h-16 w-16" />
              <p className="mt-4 text-5xl">⭐</p>
              <p className="mt-3 font-display text-3xl text-gold">Missione completata!</p>
              <p className="mt-3 text-lg">Mostra questa schermata ai volontari della casetta.</p>
              <p className="mt-6 text-xs text-muted-foreground">Demo · nessun dato salvato</p>
              <button onClick={() => setI(-1)} className="mt-4 text-sm underline">Rigioca</button>
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}
