import type { ReactNode } from "react";
import type { HelperId, MissionId, PackItemId } from "@/lib/kids-academy";

/** Hand-drawn picture-book items (SVG groups on a 120×120 grid) shared by the backpack game and the diploma. */
const O = { stroke: "var(--ink)", strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export const ITEM_ART: Record<PackItemId, ReactNode> = {
  torcia: (
    <g transform="rotate(-32 60 60)">
      <path d="M80 50 L118 30 L118 90 L80 70Z" fill="var(--kid-sun)" opacity="0.35" />
      <rect x="20" y="49" width="46" height="22" rx="9" fill="var(--scene-red)" {...O} />
      <rect x="34" y="44" width="10" height="6" rx="2" fill="var(--gold)" {...O} />
      <path d="M64 46 L80 42 L80 78 L64 74Z" fill="var(--kid-steel)" {...O} />
      <rect x="78" y="44" width="5" height="32" rx="2" fill="var(--snow)" {...O} />
      <path d="M26 54 L58 54" stroke="var(--snow)" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  acqua: (
    <g>
      <rect x="47" y="14" width="26" height="16" rx="5" fill="var(--scene-forest)" {...O} />
      <path d="M60 14 C60 6 76 6 76 16" fill="none" {...O} />
      <rect x="38" y="28" width="44" height="80" rx="16" fill="var(--kid-sky)" {...O} />
      <rect x="44" y="56" width="32" height="46" rx="10" fill="var(--kid-sky-deep)" opacity="0.55" />
      <rect x="38" y="44" width="44" height="12" fill="var(--ivory)" {...O} />
      <path d="M48 66 C48 74 52 78 52 84" stroke="var(--snow)" strokeOpacity="0.7" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  ),
  berretto: (
    <g>
      <path d="M22 80 C38 94 82 94 98 80 L98 94 C82 108 38 108 22 94Z" fill="var(--scene-forest)" {...O} />
      <path d="M40 92 L40 104 M60 96 L60 106 M80 92 L80 104" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 96 L84 96 L88 118 L74 118Z" fill="var(--scene-forest)" {...O} />
      <path d="M76 118 L76 112 M81 118 L81 112" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 64 C30 20 90 20 90 64Z" fill="var(--scene-red)" {...O} />
      <path d="M46 56 L52 34 M60 56 L60 30 M74 56 L68 34" stroke="var(--burgundy)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <rect x="24" y="58" width="72" height="18" rx="8" fill="var(--ivory)" {...O} />
      <circle cx="60" cy="18" r="10" fill="var(--snow)" {...O} />
    </g>
  ),
  guanti: (
    <g>
      <g transform="rotate(-12 40 64)">
        <path d="M24 92 L24 54 C24 36 52 36 54 54 L54 92Z" fill="var(--burgundy)" {...O} />
        <path d="M24 66 C12 60 12 46 22 46" fill="var(--burgundy)" {...O} />
        <rect x="21" y="88" width="36" height="14" rx="5" fill="var(--ivory)" {...O} />
        <circle cx="40" cy="62" r="3" fill="var(--snow)" />
      </g>
      <g transform="rotate(12 80 64)">
        <path d="M66 92 L66 54 C68 36 96 36 96 54 L96 92Z" fill="var(--scene-red)" {...O} />
        <path d="M96 66 C108 60 108 46 98 46" fill="var(--scene-red)" {...O} />
        <rect x="63" y="88" width="36" height="14" rx="5" fill="var(--ivory)" {...O} />
        <circle cx="80" cy="62" r="3" fill="var(--snow)" />
      </g>
    </g>
  ),
  telefono: (
    <g>
      <rect x="34" y="12" width="52" height="96" rx="11" fill="var(--ink)" {...O} />
      <rect x="40" y="22" width="40" height="74" rx="5" fill="var(--kid-sky)" />
      <rect x="49" y="42" width="22" height="38" rx="4" fill="var(--snow)" stroke="var(--ink)" strokeWidth="2.5" />
      <rect x="55" y="38" width="10" height="5" rx="1.5" fill="var(--snow)" stroke="var(--ink)" strokeWidth="2.5" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x="52" y={72 - i * 8} width="16" height="6" rx="1.5" fill="var(--kid-leaf)" />)}
      <circle cx="60" cy="101" r="2.5" fill="var(--kid-steel)" />
    </g>
  ),
  gelato: (
    <g>
      <path d="M40 58 L60 112 L80 58Z" fill="var(--kid-sun)" {...O} />
      <path d="M48 66 L72 90 M58 62 L76 80 M66 62 L52 92 M74 64 L58 100" stroke="var(--brick)" strokeWidth="2" strokeOpacity="0.6" />
      <circle cx="50" cy="52" r="15" fill="var(--kid-pink)" {...O} />
      <circle cx="72" cy="50" r="15" fill="var(--ivory)" {...O} />
      <circle cx="61" cy="34" r="14" fill="var(--burgundy)" {...O} />
      <circle cx="61" cy="18" r="5" fill="var(--scene-red)" {...O} />
    </g>
  ),
  pallone: (
    <g>
      <circle cx="60" cy="62" r="42" fill="var(--snow)" {...O} />
      <path d="M60 20 C40 40 40 84 60 104 C34 96 22 70 30 44 C36 30 46 22 60 20Z" fill="var(--scene-red)" />
      <path d="M60 20 C80 40 80 84 60 104 C86 96 98 70 90 44 C84 30 74 22 60 20Z" fill="var(--kid-sky)" />
      <path d="M60 20 C52 50 52 74 60 104" fill="none" stroke="var(--kid-sun)" strokeWidth="9" />
      <circle cx="60" cy="62" r="42" fill="none" {...O} />
      <circle cx="60" cy="24" r="5" fill="var(--snow)" {...O} />
    </g>
  ),
  videogioco: (
    <g>
      <path d="M20 58 C20 40 36 38 46 44 L74 44 C84 38 100 40 100 58 L104 86 C106 100 90 104 82 92 L74 80 L46 80 L38 92 C30 104 14 100 16 86Z" fill="var(--kid-steel)" {...O} />
      <path d="M36 54 L36 70 M28 62 L44 62" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="80" cy="56" r="5" fill="var(--scene-red)" {...O} />
      <circle cx="90" cy="66" r="5" fill="var(--kid-sun)" {...O} />
      <circle cx="70" cy="66" r="5" fill="var(--kid-leaf)" {...O} />
    </g>
  ),
  infradito: (
    <g>
      <g transform="rotate(-14 42 64)">
        <ellipse cx="42" cy="64" rx="17" ry="40" fill="var(--kid-pink)" {...O} />
        <path d="M42 36 L28 58 M42 36 L56 58" stroke="var(--kid-sky-deep)" strokeWidth="6" strokeLinecap="round" />
      </g>
      <g transform="rotate(14 80 64)">
        <ellipse cx="80" cy="64" rx="17" ry="40" fill="var(--kid-pink)" {...O} />
        <path d="M80 36 L66 58 M80 36 L94 58" stroke="var(--kid-sky-deep)" strokeWidth="6" strokeLinecap="round" />
      </g>
    </g>
  ),
};

export function ItemIcon({ id, className = "" }: { id: PackItemId; className?: string }) {
  return <svg viewBox="0 0 120 120" className={className} aria-hidden>{ITEM_ART[id]}</svg>;
}

/** Backpack that visibly fills: packed items peek out of the opening and the bag bulges a little. */
export function Backpack({ packed, className = "" }: { packed: PackItemId[]; className?: string }) {
  const n = packed.length;
  const bulge = 1 + Math.min(n, 5) * 0.025;
  return (
    <svg viewBox="0 0 240 270" className={className} role="img" aria-label={n ? `Zaino con ${n} oggetti` : "Zaino vuoto"}>
      <ellipse cx="120" cy="258" rx="92" ry="10" fill="var(--ink)" opacity="0.35" />
      <path d="M62 70 C40 120 44 200 58 230" fill="none" stroke="var(--burgundy)" strokeWidth="14" strokeLinecap="round" />
      <path d="M178 70 C200 120 196 200 182 230" fill="none" stroke="var(--burgundy)" strokeWidth="14" strokeLinecap="round" />
      <path d="M96 40 C96 18 144 18 144 40" fill="none" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round" />
      {/* back wall + opening */}
      <path d="M52 78 C52 52 188 52 188 78 L188 110 L52 110Z" fill="var(--burgundy)" {...O} />
      {packed.map((id, i) => (
        <g key={id} transform={`translate(${44 + (i % 5) * 30} ${30 + (i % 2) * 12}) scale(0.62)`}>{ITEM_ART[id]}</g>
      ))}
      <g transform={`translate(120 160) scale(${bulge} 1) translate(-120 -160)`}>
        <path d="M44 96 C44 82 196 82 196 96 L202 228 C202 244 190 250 176 250 L64 250 C50 250 38 244 38 228Z" fill="var(--scene-red)" {...O} />
        <path d="M60 112 L180 112" stroke="var(--snow)" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" />
        <rect x="70" y="160" width="100" height="70" rx="18" fill="var(--scene-crimson)" {...O} />
        <path d="M70 182 L170 182" stroke="var(--ink)" strokeWidth="3" strokeDasharray="6 6" />
        <rect x="74" y="140" width="92" height="10" rx="5" fill="var(--scene-snow)" opacity="0.9" {...O} />
        <path d="M44 96 C60 130 180 130 196 96 C184 86 56 86 44 96Z" fill="var(--burgundy)" {...O} />
        <rect x="108" y="116" width="24" height="18" rx="4" fill="var(--gold)" {...O} />
      </g>
    </svg>
  );
}

export const HELPER_ART: Record<HelperId, ReactNode> = {
  stella: (
    <g>
      <circle cx="50" cy="50" r="46" fill="var(--scene-night)" />
      <path d="M50 12 L60 38 L88 39 L66 56 L74 84 L50 68 L26 84 L34 56 L12 39 L40 38Z" fill="var(--kid-sun)" {...O} />
      <circle cx="43" cy="50" r="3" fill="var(--ink)" /><circle cx="57" cy="50" r="3" fill="var(--ink)" />
      <path d="M44 59 Q50 64 56 59" fill="none" {...O} strokeWidth="2.5" />
      <circle cx="37" cy="57" r="3.5" fill="var(--kid-pink)" /><circle cx="63" cy="57" r="3.5" fill="var(--kid-pink)" />
    </g>
  ),
  pupazzo: (
    <g>
      <circle cx="50" cy="50" r="46" fill="var(--kid-sky-deep)" />
      <circle cx="50" cy="70" r="20" fill="var(--snow)" {...O} />
      <circle cx="50" cy="40" r="15" fill="var(--snow)" {...O} />
      <rect x="38" y="18" width="24" height="10" rx="2" fill="var(--ink)" /><rect x="33" y="27" width="34" height="4" rx="2" fill="var(--ink)" />
      <circle cx="45" cy="38" r="2.4" fill="var(--ink)" /><circle cx="55" cy="38" r="2.4" fill="var(--ink)" />
      <path d="M50 42 L60 45 L50 46Z" fill="var(--kid-sun)" />
      <path d="M36 52 C44 58 56 58 64 52 L66 58 C56 64 44 64 34 58Z" fill="var(--scene-red)" {...O} strokeWidth="2" />
    </g>
  ),
  lanterna: (
    <g>
      <circle cx="50" cy="50" r="46" fill="var(--scene-forest)" />
      <circle cx="50" cy="56" r="26" fill="var(--kid-sun)" opacity="0.3" />
      <path d="M42 18 C42 10 58 10 58 18" fill="none" {...O} />
      <path d="M34 26 L66 26 L62 34 L38 34Z" fill="var(--ink)" />
      <rect x="36" y="34" width="28" height="38" rx="4" fill="var(--ivory)" fillOpacity="0.4" {...O} />
      <path d="M50 44 C56 52 56 60 50 64 C44 60 44 52 50 44Z" fill="var(--kid-sun)" />
      <path d="M32 72 L68 72 L64 80 L36 80Z" fill="var(--ink)" />
    </g>
  ),
  pettirosso: (
    <g>
      <circle cx="50" cy="50" r="46" fill="var(--burgundy)" />
      <path d="M22 66 L10 76 L26 74Z" fill="var(--brick)" {...O} strokeWidth="2" />
      <ellipse cx="50" cy="56" rx="28" ry="24" fill="var(--brick)" {...O} />
      <ellipse cx="58" cy="62" rx="16" ry="14" fill="var(--scene-red)" />
      <circle cx="62" cy="44" r="3.4" fill="var(--ink)" />
      <path d="M74 46 L84 49 L74 52Z" fill="var(--kid-sun)" {...O} strokeWidth="2" />
      <path d="M40 54 C34 62 36 70 44 70" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 80 L42 88 M54 80 L54 88" {...O} strokeWidth="2.5" />
    </g>
  ),
};

export function HelperBadge({ id, className = "" }: { id: HelperId; className?: string }) {
  return <svg viewBox="0 0 100 100" className={className} aria-hidden>{HELPER_ART[id]}</svg>;
}

const MEDAL_ICON: Record<MissionId, ReactNode> = {
  citta: (
    <g>
      <path d="M36 58 L50 44 L64 58 L64 74 L36 74Z" fill="var(--ivory)" {...O} strokeWidth="2.5" />
      <path d="M50 70 C42 64 44 56 50 60 C56 56 58 64 50 70Z" fill="var(--scene-red)" />
    </g>
  ),
  zaino: (
    <g>
      <path d="M38 54 C38 46 62 46 62 54 L64 76 L36 76Z" fill="var(--scene-red)" {...O} strokeWidth="2.5" />
      <rect x="42" y="62" width="16" height="10" rx="3" fill="var(--burgundy)" />
    </g>
  ),
  battito: (
    <g>
      <path d="M50 76 C30 64 32 46 42 46 C46 46 50 50 50 52 C50 50 54 46 58 46 C68 46 70 64 50 76Z" fill="var(--scene-red)" {...O} strokeWidth="2.5" />
      <path d="M36 60 L44 60 L47 54 L52 66 L55 60 L64 60" fill="none" stroke="var(--snow)" strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  ),
};

export function Medal({ mission, earned = true, className = "" }: { mission: MissionId; earned?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden>
      <path d="M34 4 L46 40 L38 44 L24 8Z" fill={earned ? "var(--scene-red)" : "var(--kid-steel)"} opacity={earned ? 1 : 0.4} />
      <path d="M66 4 L54 40 L62 44 L76 8Z" fill={earned ? "var(--scene-forest)" : "var(--kid-steel)"} opacity={earned ? 1 : 0.4} />
      <circle cx="50" cy="62" r="34" fill={earned ? "var(--gold)" : "none"} stroke={earned ? "var(--ink)" : "var(--kid-steel)"} strokeWidth="3" strokeDasharray={earned ? undefined : "6 6"} />
      {earned && <circle cx="50" cy="62" r="26" fill="none" stroke="var(--ink)" strokeOpacity="0.3" strokeWidth="2" />}
      {earned ? MEDAL_ICON[mission] : <text x="50" y="72" textAnchor="middle" fontSize="28" fill="var(--kid-steel)" fontFamily="Georgia, serif">?</text>}
    </svg>
  );
}

export function Seal({ className = "" }: { className?: string }) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2, r = i % 2 ? 40 : 46;
    return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <polygon points={pts} fill="var(--gold)" stroke="var(--ink)" strokeWidth="2" />
      <circle cx="50" cy="50" r="31" fill="var(--burgundy)" stroke="var(--gold)" strokeWidth="3" />
      <path d="M50 30 L55 44 L70 44 L58 53 L63 68 L50 59 L37 68 L42 53 L30 44 L45 44Z" fill="var(--gold)" />
    </svg>
  );
}

/** The heart of "Missione Battito": `beat` 0..1 squeezes it, `zone` colours the glow. */
export function MagicHeart({ beat, glow, className = "" }: { beat: number; glow: "idle" | "good" | "off"; className?: string }) {
  const s = 1 - beat * 0.09;
  return (
    <svg viewBox="0 0 200 190" className={className} aria-hidden>
      <defs>
        <radialGradient id="heart-fill" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="var(--scene-red)" />
          <stop offset="100%" stopColor="var(--burgundy)" />
        </radialGradient>
        <radialGradient id="heart-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={glow === "good" ? "var(--gold)" : "var(--scene-red)"} stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--scene-red)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="98" r="96" fill="url(#heart-glow)" opacity={glow === "off" ? 0.2 : glow === "good" ? 0.95 : 0.5} />
      <g transform={`translate(100 100) scale(${s}) translate(-100 -100)`}>
        <path d="M100 168 C40 128 18 96 26 66 C34 36 72 28 100 58 C128 28 166 36 174 66 C182 96 160 128 100 168Z" fill="url(#heart-fill)" stroke="var(--ink)" strokeWidth="4" />
        <path d="M54 62 C60 50 74 48 82 56" fill="none" stroke="var(--snow)" strokeOpacity="0.55" strokeWidth="8" strokeLinecap="round" />
        <path d="M56 104 L80 104 L88 88 L100 122 L110 100 L144 100" fill="none" stroke="var(--snow)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      </g>
    </svg>
  );
}
