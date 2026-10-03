import { useEffect, useState } from "react";
import { Tree } from "./Tree";
import { Snow } from "./Snow";
import { FakeQr } from "./Qr";
import { CriMark, OrnamentIcon } from "./Ornament";
import { MOCK_TOTAL_GIFTS, TREE_ORNAMENTS, type TreeOrnament } from "@/lib/data";

const NEW_ONE: TreeOrnament = { id: 99, kind: "dae", x: 47, y: 52, dedica: "Il mio primo regalo per Monza.", firma: "Luca, 9 anni" };
const DEDICATED = TREE_ORNAMENTS.filter((o) => o.dedica);

type Phase = "idle" | "focus" | "flip" | "arrive" | "callout";

/** Autoplaying 16:9 TV composition. Sizes use container units. */
export function TreeTV() {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<TreeOrnament | null>(null);
  const [ornaments, setOrnaments] = useState(TREE_ORNAMENTS);
  const [count, setCount] = useState(MOCK_TOTAL_GIFTS);

  useEffect(() => {
    const seq: { p: Phase; ms: number }[] = [
      { p: "idle", ms: 3500 },
      { p: "focus", ms: 1800 },
      { p: "flip", ms: 4500 },
      { p: "idle", ms: 2500 },
      { p: "focus", ms: 1800 },
      { p: "flip", ms: 4500 },
      { p: "idle", ms: 2000 },
      { p: "arrive", ms: 4500 },
      { p: "callout", ms: 5000 },
    ];
    const cur = seq[step % seq.length]!;
    setPhase(cur.p);
    if (cur.p === "focus") {
      const n = Math.floor(step / seq.length) * 2 + (step % seq.length === 1 ? 0 : 1);
      setTarget(DEDICATED[n % DEDICATED.length] ?? null);
    }
    if (cur.p === "arrive") {
      setOrnaments((o) => (o.some((x) => x.id === 99) ? o : [...o, NEW_ONE]));
      setTarget(NEW_ONE);
      setCount((c) => c + 1);
    }
    if (cur.p === "idle" && step % seq.length === 0) {
      setOrnaments(TREE_ORNAMENTS);
      setCount(MOCK_TOTAL_GIFTS);
    }
    const t = setTimeout(() => setStep((s) => s + 1), cur.ms);
    return () => clearTimeout(t);
  }, [step]);

  const focusId = phase === "focus" || phase === "flip" || phase === "arrive" ? target?.id : null;

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-background [container-type:inline-size]">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 38% 40%, oklch(0.32 0.08 160), var(--background) 65%), radial-gradient(circle at 90% 90%, oklch(0.35 0.14 27 / 35%), transparent 50%)" }} />
      <Snow count={70} />

      {/* header */}
      <div className="absolute left-[3cqw] top-[3cqw] flex items-center gap-[1cqw]">
        <CriMark className="h-[3.6cqw] w-[3.6cqw]" />
        <div className="leading-tight">
          <p className="text-[1.1cqw] font-semibold uppercase tracking-[0.2em] text-gold">Croce Rossa Italiana · Monza</p>
          <p className="font-display text-[2.2cqw]">L'Albero dei Regali di Monza</p>
        </div>
      </div>
      <div className="absolute right-[3cqw] top-[3cqw] rounded-full border hairline-gold px-[1.2cqw] py-[0.5cqw] text-[0.9cqw] uppercase tracking-widest text-gold">
        Anteprima demo · dati simulati
      </div>

      {/* tree */}
      <div className="absolute bottom-[2%] left-[6%] h-[86%] w-[50%]">
        <Tree ornaments={ornaments} focusId={focusId} flippedId={phase === "flip" ? target?.id : null} arrivingId={phase === "arrive" ? 99 : null} />
      </div>

      {/* right column */}
      <div className="absolute right-[4cqw] top-1/2 flex w-[34cqw] -translate-y-1/2 flex-col gap-[1.6cqw]">
        <div>
          <p className="font-display text-[5.4cqw] leading-none text-glow">
            <span className="shimmer-gold bg-clip-text text-transparent">{count}</span>
          </p>
          <p className="mt-[0.6cqw] text-[1.5cqw] text-muted-foreground">regali appesi all'Albero di Monza <span className="text-[1cqw]">(demo)</span></p>
        </div>
        <div className="glass flex items-center gap-[1.6cqw] rounded-[1.4cqw] p-[1.4cqw]">
          <FakeQr className="w-[11cqw] shrink-0 rounded-[0.6cqw]" />
          <div>
            <p className="font-display text-[1.8cqw] leading-tight">Scansiona e appendi anche tu un regalo all'Albero di Monza</p>
            <p className="mt-[0.6cqw] text-[1.1cqw] text-gold">Scopri come fare il tuo regalo →</p>
          </div>
        </div>
        <div className="flex gap-[1cqw]">
          {(["dae", "calore", "prossimita", "cuore"] as const).map((k) => (
            <div key={k} className="flex flex-1 flex-col items-center gap-[0.3cqw]">
              <OrnamentIcon kind={k} className="w-[3.4cqw]" />
              <span className="text-center text-[0.85cqw] text-muted-foreground">
                {k === "dae" ? "Un battito" : k === "calore" ? "Calore" : k === "prossimita" ? "Prossimità" : "Dove serve"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* arrive banner */}
      {phase === "arrive" && (
        <div className="animate-rise absolute bottom-[4cqw] left-[8cqw] rounded-full bg-primary px-[2cqw] py-[0.8cqw] text-[1.3cqw] font-semibold text-primary-foreground shadow-deep">
          ✨ Nuovo regalo appeso · “Regala un battito”
        </div>
      )}

      {/* callout */}
      {phase === "callout" && (
        <div className="animate-rise absolute inset-0 z-40 flex items-center justify-center bg-background/75 backdrop-blur-md">
          <div className="max-w-[60cqw] text-center">
            <p className="text-[4cqw]">🎄</p>
            <p className="mt-[1cqw] font-display text-[4cqw] leading-tight">
              <span className="text-gold">{count} regali</span> sono già appesi all'Albero di Monza.
            </p>
            <p className="mt-[1.4cqw] font-display text-[2.6cqw] italic text-muted-foreground">Il prossimo può essere il tuo.</p>
            <p className="mt-[2cqw] text-[1cqw] uppercase tracking-widest text-gold">Casetta CRI · Piazza San Paolo · Dati demo</p>
          </div>
        </div>
      )}
    </div>
  );
}
