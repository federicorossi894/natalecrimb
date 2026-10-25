import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { SANTA_CONTRIBUTION_EUR, SANTA_CONTRIBUTION_NOTE } from "@/lib/santa";
import { cn } from "@/lib/utils";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const STARS = [[40, 40], [130, 28], [210, 60], [330, 34], [372, 96], [98, 120], [300, 140], [180, 150]] as const;

/** Full story length in ms (landing → down the chimney → window lights up). */
export const SANTA_FULL_MS = 3400;
/** Home teaser stops once Santa has landed on the chimney. */
export const SANTA_TEASER_END = 0.3;
/** Static frame for reduced motion: Santa on the chimney, window already lit. */
const STATIC_P = 0.26;

/**
 * Illustrated rooftop: Santa (CRI-volunteer-style red jacket with reflective bands, sack on the
 * shoulder) lands on the chimney and slides down as `p` goes 0 → 1. No emblem is drawn: the CRI
 * mark is never redrawn, so the jacket only carries stylised reflective details.
 */
export function SantaScene({ p, forceLit = false, className = "" }: { p: number; forceLit?: boolean; className?: string }) {
  const drop = ease(seg(p, 0, 0.24));
  const down = ease(seg(p, 0.32, 0.72));
  const lit = forceLit ? 1 : seg(p, 0.68, 0.9);
  const x = 130 + drop * 150;
  const y = 120 + drop * 72 + down * 170;
  const rot = -14 * (1 - drop);
  return (
    <svg viewBox="0 0 400 480" className={className} preserveAspectRatio="xMidYMax meet" role="img" aria-label="Babbo Natale, con il sacco in spalla e una giacca rossa da volontario, scende nel camino di una casa di Monza">
      <defs>
        <clipPath id="santa-above-chimney" clipPathUnits="userSpaceOnUse"><rect x="-50" y="-400" width="500" height="600" /></clipPath>
        <radialGradient id="santa-window-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="64" cy="78" r="26" fill="var(--ivory)" opacity="0.9" />
      <circle cx="74" cy="72" r="24" fill="var(--scene-night)" opacity="0.55" />
      {STARS.map(([sx, sy], i) => (
        <circle key={i} cx={sx} cy={sy} r={i % 3 ? 1.6 : 2.4} fill="var(--gold)" className="animate-twinkle" style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${sx}px ${sy}px` }} />
      ))}
      <path d="M0 300 Q80 250 160 285 T320 270 T400 290 L400 480 L0 480Z" fill="var(--fir-deep)" opacity="0.7" />
      {/* chimney body (behind roof) */}
      <rect x="258" y="200" width="44" height="110" fill="var(--brick)" />
      {[212, 224, 236, 248, 260].map((ly) => <line key={ly} x1="258" x2="302" y1={ly} y2={ly} stroke="var(--ink)" strokeOpacity="0.3" />)}
      {/* house */}
      <rect x="54" y="332" width="292" height="148" fill="var(--burgundy)" />
      <ellipse cx="200" cy="414" rx={70 + lit * 50} ry={56 + lit * 30} fill="url(#santa-window-glow)" opacity={0.2 + lit * 0.8} />
      <rect x="152" y="376" width="96" height="76" rx="4" fill="var(--ink)" />
      <rect x="152" y="376" width="96" height="76" rx="4" fill="var(--gold)" opacity={0.18 + lit * 0.72} />
      <path d="M200 386 L222 436 L178 436Z" fill="var(--fir)" opacity={0.5 + lit * 0.5} />
      <rect x="182" y="438" width="12" height="10" fill="var(--primary)" opacity={lit} />
      <rect x="205" y="440" width="12" height="8" fill="var(--fir-deep)" opacity={lit} />
      <path d="M200 376 V452 M152 414 H248" stroke="var(--ivory)" strokeWidth="4" />
      <path d="M30 342 L200 224 L370 342 Z" fill="var(--ink)" />
      <path d="M26 344 L200 222 L374 344" fill="none" stroke="var(--snow)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      {/* Santa */}
      <g clipPath="url(#santa-above-chimney)">
        <g transform={`translate(${x} ${y}) rotate(${rot})`}>
          {/* sack over the left shoulder */}
          <path d="M-29 -104 Q-52 -98 -49 -72 Q-47 -50 -29 -50 Q-11 -51 -13 -74 Q-15 -96 -25 -104Z" fill="var(--kraft)" stroke="var(--wood-dark)" strokeWidth="1.5" />
          <path d="M-40 -84 Q-36 -70 -38 -58 M-22 -88 Q-19 -74 -21 -60" stroke="var(--wood)" strokeWidth="1.2" fill="none" opacity="0.7" />
          <ellipse cx="-27" cy="-103" rx="5.5" ry="2.6" fill="var(--wood-dark)" />
          {/* boots */}
          <rect x="-17" y="-12" width="15" height="12" rx="3" fill="var(--ink)" />
          <rect x="2" y="-12" width="15" height="12" rx="3" fill="var(--ink)" />
          {/* trousers */}
          <rect x="-15" y="-33" width="13" height="23" rx="3" fill="var(--burgundy)" />
          <rect x="2" y="-33" width="13" height="23" rx="3" fill="var(--burgundy)" />
          {/* volunteer-style red jacket */}
          <path d="M-22 -30 Q-24 -92 0 -96 Q24 -92 22 -30Z" fill="var(--primary)" />
          <line x1="0" y1="-92" x2="0" y2="-31" stroke="var(--ink)" strokeOpacity="0.35" strokeWidth="1.2" />
          <rect x="-23" y="-44" width="46" height="4.5" fill="var(--snow)" />
          <rect x="-23" y="-37" width="46" height="4.5" fill="var(--snow)" />
          <rect x="-23" y="-44" width="46" height="1.2" fill="var(--snow)" opacity="0.8" />
          <rect x="-23" y="-37" width="46" height="1.2" fill="var(--snow)" opacity="0.8" />
          <rect x="-22" y="-63" width="44" height="7" fill="var(--ink)" />
          <rect x="-5" y="-64" width="10" height="9" fill="none" stroke="var(--gold)" strokeWidth="2" />
          {/* arms: left holds the sack, right waves; reflective cuffs */}
          <path d="M-17 -86 Q-29 -92 -27 -104 M17 -86 Q30 -108 26 -124" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M-32 -97 L-22 -97 M21 -114 L31 -114" stroke="var(--snow)" strokeWidth="3.5" />
          <circle cx="-27" cy="-106" r="5.5" fill="var(--ink)" />
          <circle cx="26" cy="-127" r="6" fill="var(--ink)" />
          {/* head, beard, hat */}
          <circle cx="0" cy="-108" r="13" fill="var(--skin)" />
          <path d="M-14 -106 Q-16 -82 0 -78 Q16 -82 14 -106 Q0 -98 -14 -106Z" fill="var(--snow)" />
          <ellipse cx="0" cy="-103" rx="8" ry="3" fill="var(--snow)" />
          <circle cx="-5" cy="-112" r="1.6" fill="var(--ink)" />
          <circle cx="5" cy="-112" r="1.6" fill="var(--ink)" />
          <path d="M-14 -117 Q0 -152 24 -138 L14 -119Z" fill="var(--primary)" />
          <rect x="-16" y="-123" width="32" height="7" rx="3.5" fill="var(--snow)" />
          <circle cx="25" cy="-138" r="5" fill="var(--snow)" />
        </g>
      </g>
      {/* chimney cap in front */}
      <rect x="252" y="192" width="56" height="12" rx="2" fill="var(--ink)" />
      <path d="M250 194 Q280 182 310 194Z" fill="var(--snow)" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={272 + i * 9} cy={176 - lit * (18 + i * 10)} r={3 + i} fill="var(--gold)" opacity={lit * (0.9 - i * 0.25)} />
      ))}
    </svg>
  );
}

/**
 * Time-driven playback, decoupled from scroll: starts once when the scene enters the viewport,
 * then runs on its own (never blocks scrolling, fixed box = no layout shift). Reduced motion → static frame.
 * `teaser` stops when Santa lands on the chimney; `full` plays the whole story and offers a replay.
 */
export function AutoSantaScene({ mode, className = "" }: { mode: "teaser" | "full"; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const target = mode === "full" ? 1 : SANTA_TEASER_END;
  const [p, setP] = useState(0);
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const play = () => {
      const t0 = performance.now();
      const dur = target * SANTA_FULL_MS;
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        setP(k * target);
        if (k < 1) raf = requestAnimationFrame(tick);
        else setDone(true);
      };
      raf = requestAnimationFrame(tick);
    };
    setP(0);
    setDone(false);
    if (run > 0 || typeof IntersectionObserver === "undefined") {
      play();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      play();
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [reduced, target, run]);

  const shown = reduced ? STATIC_P : p;
  return (
    <div ref={ref} className={cn("relative", className)} data-testid="santa-scene" data-santa-progress={shown.toFixed(2)}>
      <SantaScene p={shown} forceLit={reduced} className="block h-full w-full" />
      {mode === "full" && done && !reduced && (
        <button type="button" onClick={() => setRun((r) => r + 1)} className="glass absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Rivedi la scena
        </button>
      )}
    </div>
  );
}

const STEPS = [
  { t: "I regali li prepari tu", d: "La famiglia incarta i regali e li consegna in sede qualche giorno prima, indicativamente il sabato prima della Vigilia." },
  { t: "La sera della Vigilia", d: "I volontari CRI, vestiti da Babbo Natale e aiutanti, partono per le case di Monza." },
  { t: "Qualcuno bussa alla porta", d: "Il resto lo fanno gli occhi dei bambini." },
];

/** Home storytelling section: a short automatic teaser (Santa lands on the chimney); the full story plays on /babbo-natale. */
export function SantaChimneySection() {
  return (
    <section aria-labelledby="santa-title" className="mt-24">
      <div className="santa-stage overflow-clip">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Area grandi 🤫 · sezione speciale</p>
            <h2 id="santa-title" className="mt-2 font-display text-4xl leading-[1.02] sm:text-6xl">Prenota il tuo <em className="not-italic text-gold">Babbo Natale</em></h2>
            <ol className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
              {STEPS.map((s, i) => (
                <li key={s.t} className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border hairline-gold font-display text-sm text-gold">{i + 1}</span>
                  <span><span className="block font-display text-lg leading-tight">{s.t}</span><span className="block text-sm text-muted-foreground">{s.d}</span></span>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/babbo-natale" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-deep transition hover:scale-[1.02]">
                Scopri e prenota · demo <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-xs text-muted-foreground">Contributo DEMO €{SANTA_CONTRIBUTION_EUR} a famiglia · {SANTA_CONTRIBUTION_NOTE}</span>
            </div>
          </div>
          <AutoSantaScene mode="teaser" className="mx-auto aspect-[5/6] w-full max-w-[400px]" />
        </div>
      </div>
    </section>
  );
}
