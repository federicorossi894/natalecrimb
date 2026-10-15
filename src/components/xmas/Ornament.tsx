import type { OrnamentKind } from "@/lib/data";

/** Simbolic tree ornaments, drawn as SVG baubles. Colors come from CSS tokens. */
export function OrnamentIcon({ kind, className = "" }: { kind: OrnamentKind; className?: string }) {
  return (
    <svg viewBox="0 0 64 72" className={className} aria-hidden>
      <defs>
        <radialGradient id={`g-${kind}`} cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="var(--snow)" stopOpacity="0.9" />
          <stop offset="35%" stopColor={kind === "dae" ? "var(--fir)" : kind === "prossimita" ? "var(--gold)" : "var(--primary)"} />
          <stop offset="100%" stopColor={kind === "dae" ? "var(--fir-deep)" : kind === "prossimita" ? "oklch(0.55 0.1 70)" : "oklch(0.38 0.16 27)"} />
        </radialGradient>
      </defs>
      <line x1="32" y1="0" x2="32" y2="8" stroke="var(--gold)" strokeWidth="1.5" />
      <rect x="27" y="6" width="10" height="6" rx="1.5" fill="var(--gold)" />
      <circle cx="32" cy="42" r="28" fill={`url(#g-${kind})`} stroke="var(--gold)" strokeOpacity="0.6" />
      <g transform="translate(32 42)" fill="var(--snow)">
        {kind === "cuore" && (
          <>
            <path d="M0 13 C-14 3 -14 -9 -6 -10 C-3 -10 -1 -8 0 -6 C1 -8 3 -10 6 -10 C14 -9 14 3 0 13Z" />
            <rect x="-2" y="-6" width="4" height="12" fill="var(--primary)" />
            <rect x="-6" y="-2" width="12" height="4" fill="var(--primary)" />
          </>
        )}
        {kind === "dae" && (
          <>
            <rect x="-12" y="-11" width="24" height="22" rx="4" />
            <path d="M0 6 C-8 0 -8 -6 -4 -7 C-2 -7 -1 -6 0 -4 C1 -6 2 -7 4 -7 C8 -6 8 0 0 6Z" fill="var(--fir)" />
            <path d="M1 -6 L-2 0 L1 0 L-1 5 L4 -1 L1 -1 L3 -6Z" fill="var(--gold)" />
          </>
        )}
        {kind === "calore" && (
          <>
            <path d="M-13 -8 Q0 -14 13 -8 L13 -2 Q0 -8 -13 -2Z" />
            <path d="M4 -4 L10 -4 L9 12 L4 12Z" />
            <path d="M4 12 L4 15 M6 12 L6 15 M8 12 L8 15" stroke="var(--snow)" strokeWidth="1" />
            <path d="M-13 -5 Q0 -11 13 -5" stroke="var(--primary)" strokeWidth="1.5" fill="none" />
          </>
        )}
        {kind === "prossimita" && (
          <>
            <path d="M-15 6 L-15 -6 Q-15 -9 -12 -9 L6 -9 L13 -1 L15 1 L15 6Z" />
            <rect x="-11" y="-6" width="7" height="5" fill="var(--fir-deep)" />
            <rect x="5" y="-6" width="5" height="4" fill="var(--fir-deep)" />
            <rect x="-2" y="-6" width="2" height="6" fill="var(--primary)" />
            <rect x="-4" y="-4" width="6" height="2" fill="var(--primary)" />
            <circle cx="-8" cy="7" r="3" fill="var(--ink)" />
            <circle cx="9" cy="7" r="3" fill="var(--ink)" />
          </>
        )}
      </g>
      <ellipse cx="22" cy="28" rx="6" ry="3.5" fill="var(--snow)" opacity="0.35" transform="rotate(-30 22 28)" />
    </svg>
  );
}

import bianco from "@/assets/cri-bianco-orizzontale.png.asset.json";
import rosso from "@/assets/cri-rosso-orizzontale.png.asset.json";
import verticale from "@/assets/cri-bianco-verticale.png.asset.json";

/** Official CRI mark (unaltered RGB files from Marchio.zip; transparent margins = clear space). */
export function CriMark({ className = "", variant = "white" }: { className?: string; variant?: "white" | "red" | "vertical" }) {
  const src = variant === "red" ? rosso.url : variant === "vertical" ? verticale.url : bianco.url;
  return <img src={src} alt="Croce Rossa Italiana" className={`cri-official-mark w-auto ${className}`} />;
}
