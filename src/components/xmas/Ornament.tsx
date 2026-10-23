import { CRI_RED, LOCKUP, TERRITORIAL_LABEL, lockupText, type LockupLayout } from "@/lib/cri-lockup";
import type { OrnamentKind } from "@/lib/data";

/** 2D twin of the 3D baubles: same four palettes and painted motifs. No CRI emblem is drawn. */
const ICON: Record<OrnamentKind, { base: string; motif: string }> = {
  calore: { base: "var(--scene-crimson)", motif: "var(--scene-ivory)" },
  dae: { base: "var(--scene-forest)", motif: "var(--scene-red)" },
  prossimita: { base: "var(--scene-ivory)", motif: "var(--scene-burgundy)" },
  cuore: { base: "var(--scene-burgundy)", motif: "var(--scene-gold)" },
};
export function OrnamentIcon({ kind, className = "" }: { kind: OrnamentKind; className?: string }) {
  const c = ICON[kind];
  return (
    <svg viewBox="0 0 64 72" className={className} aria-hidden>
      <defs>
        <radialGradient id={`g-${kind}`} cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="var(--scene-ivory)" stopOpacity="0.55" />
          <stop offset="30%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.base} stopOpacity="0.75" />
        </radialGradient>
      </defs>
      <line x1="32" y1="0" x2="32" y2="8" stroke="var(--scene-gold)" strokeWidth="1.5" />
      <rect x="27" y="6" width="10" height="6" rx="1.5" fill="var(--scene-gold)" />
      <circle cx="32" cy="42" r="28" fill="var(--scene-night)" />
      <circle cx="32" cy="42" r="28" fill={`url(#g-${kind})`} stroke="var(--scene-gold)" strokeWidth="1.5" />
      <circle cx="32" cy="42" r="19" fill="none" stroke="var(--scene-gold)" strokeOpacity="0.7" />
      <g transform="translate(32 42)">
        {kind === "cuore" && <path d="M0 12 C-15 2 -14 -10 -6 -10 C-3 -10 -1 -8 0 -6 C1 -8 3 -10 6 -10 C14 -10 15 2 0 12Z" fill={c.motif} />}
        {kind === "dae" && (
          <>
            <rect x="-11" y="-10" width="22" height="20" rx="3.5" fill={c.motif} stroke="var(--scene-ivory)" strokeWidth="1.2" />
            <path d="M0 6 C-8 0 -8 -6 -4 -7 C-2 -7 -1 -6 0 -4 C1 -6 2 -7 4 -7 C8 -6 8 0 0 6Z" fill="var(--scene-ivory)" />
            <path d="M1 -6 L-2 0 L1 0 L-1 5 L4 -1 L1 -1 L3 -6Z" fill="var(--scene-gold)" />
          </>
        )}
        {kind === "calore" && (
          <g fill={c.motif}>
            <path d="M-12 -8 Q0 4 12 -8 L12 -3 Q0 9 -12 -3Z" />
            <path d="M3 -1 L9 -1 L8 13 L3 13Z" />
            <path d="M-4 0 L1 0 L0 11 L-4 11Z" />
          </g>
        )}
        {kind === "prossimita" && (
          <>
            <path d="M-15 6 L-15 -6 Q-15 -9 -12 -9 L6 -9 L12 -2 L15 0 L15 6Z" fill={c.motif} />
            <rect x="-12" y="-6" width="7" height="5" rx="1" fill="var(--scene-ivory)" />
            <rect x="-3" y="-6" width="7" height="5" rx="1" fill="var(--scene-ivory)" />
            <rect x="-15" y="1" width="30" height="1.6" fill="var(--scene-gold)" />
            <circle cx="-8" cy="7" r="3" fill="var(--scene-night)" />
            <circle cx="9" cy="7" r="3" fill="var(--scene-night)" />
          </>
        )}
      </g>
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

/**
 * Official CRI mark (image left untouched) + territorial indication "Comitato di Monza" composed per the CRI
 * manual §1.3 (see src/lib/cri-lockup.ts). Use this wherever the Comitato signs; the campaign title stays separate.
 */
export function CriLockup({ className = "", variant = "white", layout = "horizontal" }: { className?: string; variant?: "white" | "red"; layout?: LockupLayout }) {
  const g = LOCKUP[layout];
  const t = lockupText(layout);
  const src = layout === "vertical" ? verticale.url : variant === "red" ? rosso.url : bianco.url;
  const fill = variant === "red" && layout === "horizontal" ? CRI_RED : "#FFFFFF";
  return (
    <svg viewBox={g.view.join(" ")} role="img" aria-label={`Croce Rossa Italiana – ${TERRITORIAL_LABEL}`} className={`cri-official-mark w-auto ${className}`} data-testid="cri-lockup">
      <image href={src} x={0} y={0} width={g.w} height={g.h} />
      <text x={t.x} y={t.baseline} textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight={400} fontSize={t.fontSize} fill={fill}>{TERRITORIAL_LABEL}</text>
    </svg>
  );
}
