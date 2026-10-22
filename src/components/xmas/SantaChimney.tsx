import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { SANTA_CONTRIBUTION_EUR, SANTA_CONTRIBUTION_NOTE } from "@/lib/santa";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const STARS = [[40, 40], [130, 28], [210, 60], [330, 34], [372, 96], [98, 120], [300, 140], [180, 150]] as const;

/** Illustrated rooftop: Santa lands on the chimney and slides down as `p` goes 0 → 1. */
export function SantaScene({ p, forceLit = false, className = "" }: { p: number; forceLit?: boolean; className?: string }) {
  const drop = ease(seg(p, 0, 0.24));
  const down = ease(seg(p, 0.32, 0.72));
  const lit = forceLit ? 1 : seg(p, 0.68, 0.9);
  const x = 130 + drop * 150;
  const y = 120 + drop * 72 + down * 170;
  const rot = -14 * (1 - drop);
  return (
    <svg viewBox="0 0 400 480" className={className} preserveAspectRatio="xMidYMax meet" role="img" aria-label="Babbo Natale scende nel camino di una casa di Monza">
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
          <ellipse cx="-28" cy="-66" rx="19" ry="24" fill="var(--fir)" />
          <path d="M-36 -88 Q-28 -94 -20 -88" stroke="var(--gold)" strokeWidth="3" fill="none" />
          <rect x="-16" y="-12" width="14" height="12" rx="3" fill="var(--ink)" />
          <rect x="2" y="-12" width="14" height="12" rx="3" fill="var(--ink)" />
          <rect x="-15" y="-40" width="30" height="30" rx="6" fill="var(--primary)" />
          <path d="M-22 -38 Q-24 -92 0 -96 Q24 -92 22 -38Z" fill="var(--primary)" />
          <rect x="-23" y="-45" width="46" height="8" rx="4" fill="var(--snow)" />
          <rect x="-22" y="-63" width="44" height="7" fill="var(--ink)" />
          <rect x="-5" y="-64" width="10" height="9" fill="none" stroke="var(--gold)" strokeWidth="2" />
          <path d="M-17 -86 Q-30 -108 -26 -124 M17 -86 Q30 -108 26 -124" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round" fill="none" />
          <circle cx="-26" cy="-127" r="6" fill="var(--fir-deep)" />
          <circle cx="26" cy="-127" r="6" fill="var(--fir-deep)" />
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

const STEPS = [
  { t: "I regali li prepari tu", d: "La famiglia incarta i regali e li consegna in sede qualche giorno prima, indicativamente il sabato prima della Vigilia." },
  { t: "La sera della Vigilia", d: "I volontari CRI, vestiti da Babbo Natale e aiutanti, partono per le case di Monza." },
  { t: "Qualcuno bussa alla porta", d: "Il resto lo fanno gli occhi dei bambini." },
];

/** Home storytelling section, scroll-driven with a single passive listener; static under reduced motion. */
export function SantaChimneySection() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const v = total > 0 ? clamp(-r.top / total) : 1;
      setP((prev) => (Math.abs(prev - v) > 0.003 ? v : prev));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [reduced]);
  const step = reduced ? 3 : p < 0.3 ? 0 : p < 0.7 ? 1 : 2;

  return (
    <section ref={ref} aria-labelledby="santa-title" className={`mt-24 ${reduced ? "" : "h-[260svh]"}`}>
      <div className={`santa-stage overflow-clip ${reduced ? "py-16" : "sticky top-0 h-svh"}`}>
        <div className="mx-auto grid h-full max-w-6xl grid-rows-[auto_1fr] gap-2 px-5 pt-20 md:grid-cols-2 md:grid-rows-1 md:items-center md:pt-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Area grandi 🤫 · sezione speciale</p>
            <h2 id="santa-title" className="mt-2 font-display text-4xl leading-[1.02] sm:text-6xl">Prenota il tuo <em className="not-italic text-gold">Babbo Natale</em></h2>
            <ol className="mt-4 space-y-2.5 sm:mt-6 sm:space-y-4">
              {STEPS.map((s, i) => (
                <li key={s.t} className={`flex gap-3 transition-opacity duration-500 ${reduced || i <= step ? "opacity-100" : "opacity-35"}`}>
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-display text-sm ${i === step ? "border-gold bg-gold text-accent-foreground" : "hairline-gold text-gold"}`}>{i + 1}</span>
                  <span><span className="block font-display text-lg leading-tight">{s.t}</span><span className={`text-sm text-muted-foreground ${i === step || reduced ? "block" : "hidden sm:block"}`}>{s.d}</span></span>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link to="/babbo-natale" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-deep transition hover:scale-[1.02]">
                Scopri e prenota · demo <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-xs text-muted-foreground">Contributo DEMO €{SANTA_CONTRIBUTION_EUR} a famiglia · {SANTA_CONTRIBUTION_NOTE}</span>
            </div>
          </div>
          <SantaScene p={reduced ? 0.26 : p} forceLit={reduced} className="h-full max-h-[62svh] w-full self-end md:max-h-[80svh]" />
        </div>
      </div>
    </section>
  );
}
