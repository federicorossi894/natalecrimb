import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shell, PageHead } from "@/components/xmas/Shell";

export const Route = createFileRoute("/giochi")({
  head: () => ({
    meta: [
      { title: "Giochi del piccolo soccorritore – CRI Monza" },
      { name: "description", content: "Due mini giochi educativi: prepara lo zaino del soccorritore e trova il ritmo del massaggio cardiaco." },
      { property: "og:title", content: "Giochi del piccolo soccorritore" },
      { property: "og:description", content: "Zaino del soccorritore e gioco del ritmo: impara giocando con CRI Monza." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Giochi,
});

function Giochi() {
  return (
    <Shell>
      <PageHead kicker="Impara giocando · DEMO" title="Giochi del piccolo soccorritore" />
      <section className="mx-auto grid max-w-5xl gap-6 px-4 md:grid-cols-2">
        <Zaino />
        <Ritmo />
      </section>
      <p className="mx-auto mt-6 max-w-5xl px-4 text-[11px] text-muted-foreground">Giochi dimostrativi a scopo educativo: non sostituiscono un corso di primo soccorso.</p>
    </Shell>
  );
}

const ITEMS = [
  { n: "Guanti", e: "🧤", ok: true }, { n: "Garze", e: "🩹", ok: true }, { n: "Coperta termica", e: "🟨", ok: true },
  { n: "Acqua", e: "💧", ok: true }, { n: "Torcia", e: "🔦", ok: true }, { n: "Videogioco", e: "🎮", ok: false },
  { n: "Pallone", e: "⚽", ok: false }, { n: "Caramelle", e: "🍬", ok: false },
];

function Zaino() {
  const [sel, setSel] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const right = ITEMS.filter((i) => i.ok).length;
  const score = ITEMS.filter((i) => sel.includes(i.n) === i.ok).length;
  return (
    <div className="glass rounded-3xl p-5">
      <h2 className="font-display text-2xl">🎒 Lo zaino del soccorritore</h2>
      <p className="mt-1 text-sm text-muted-foreground">Scegli i {right} oggetti che servono davvero.</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {ITEMS.map((i) => {
          const on = sel.includes(i.n);
          const st = checked ? (i.ok ? "border-fir" : on ? "border-primary" : "") : on ? "border-gold bg-secondary" : "";
          return (
            <button key={i.n} disabled={checked} onClick={() => setSel(on ? sel.filter((x) => x !== i.n) : [...sel, i.n])} className={`flex flex-col items-center rounded-2xl border p-2 text-[11px] ${st}`}>
              <span className="text-2xl">{i.e}</span>{i.n}
            </button>
          );
        })}
      </div>
      {checked ? (
        <div className="mt-4">
          <p className="font-semibold text-gold">{score === ITEMS.length ? "Perfetto, zaino pronto! 🎉" : `${score}/${ITEMS.length} scelte giuste`}</p>
          <button onClick={() => { setSel([]); setChecked(false); }} className="mt-2 text-sm underline">Riprova</button>
        </div>
      ) : (
        <button onClick={() => setChecked(true)} className="mt-4 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground">Controlla lo zaino</button>
      )}
    </div>
  );
}

function Ritmo() {
  const [taps, setTaps] = useState<number[]>([]);
  const [bpm, setBpm] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  const tap = () => {
    const now = performance.now();
    const next = [...taps.filter((x) => now - x < 4000), now].slice(-8);
    setTaps(next);
    setPulse(true); clearTimeout(t.current); t.current = setTimeout(() => setPulse(false), 120);
    if (next.length >= 4) {
      const avg = (next[next.length - 1]! - next[0]!) / (next.length - 1);
      setBpm(Math.round(60000 / avg));
    }
  };
  const ok = bpm !== null && bpm >= 100 && bpm <= 120;
  return (
    <div className="glass rounded-3xl p-5 text-center">
      <h2 className="font-display text-2xl">❤️ Trova il ritmo</h2>
      <p className="mt-1 text-sm text-muted-foreground">Il massaggio cardiaco va fatto a 100–120 compressioni al minuto. Tocca il cuore a tempo!</p>
      <button onClick={tap} aria-label="Tocca a ritmo" className={`mx-auto mt-5 flex h-32 w-32 items-center justify-center rounded-full bg-primary text-5xl text-primary-foreground shadow-deep transition-transform ${pulse ? "scale-90" : ""}`}>♥</button>
      <p className="mt-4 font-display text-3xl">{bpm ?? "–"} <span className="text-sm text-muted-foreground">al minuto</span></p>
      <p className={`mt-1 text-sm font-semibold ${ok ? "text-gold" : "text-muted-foreground"}`}>
        {bpm === null ? "Tocca almeno 4 volte" : ok ? "Ritmo perfetto! 🎉" : bpm < 100 ? "Un po' più veloce" : "Un po' più lento"}
      </p>
    </div>
  );
}
