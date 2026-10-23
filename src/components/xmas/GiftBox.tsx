import { useId } from "react";
import type { Project } from "@/lib/data";
import { OrnamentIcon } from "./Ornament";

/**
 * Illustrated 2.5D gift box (isometric SVG) in the project's palette. The lid is a separate group so it can lift
 * on hover/focus and fly open on tap (`open`), revealing the project's bauble.
 */
export function GiftBox({ project, open = false, className = "" }: { project: Project; open?: boolean; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const bg = `var(${project.theme.bg})`, rib = `var(${project.theme.ribbon})`;
  const pat = `pat-${uid}`, patL = `patl-${uid}`, patR = `patr-${uid}`, top = `top-${uid}`, blur = `blur-${uid}`, bow = `bow-${uid}`;
  const motif = (() => {
    switch (project.id) {
      case "calore": return <path d="M6 1 L6 11 M1 6 L11 6 M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5" stroke={rib} strokeWidth="0.9" strokeLinecap="round" />;
      case "battito": return <path d="M0 7 L3 7 L4.5 3 L6.5 11 L8 7 L12 7" fill="none" stroke={rib} strokeWidth="0.9" strokeLinejoin="round" />;
      case "prossimita": return <circle cx="6" cy="6" r="1.6" fill={rib} />;
      default: return <path d="M6 9.5 C2 6.8 2.4 3.6 4.3 3.6 C5.1 3.6 5.6 4.1 6 4.7 C6.4 4.1 6.9 3.6 7.7 3.6 C9.6 3.6 10 6.8 6 9.5Z" fill={rib} />;
    }
  })();
  return (
    <div className={`gift-box relative ${open ? "is-open" : ""} ${className}`}>
      <div className="gift-glow pointer-events-none absolute left-1/2 top-[30%] h-[60%] w-[80%] -translate-x-1/2 rounded-full bg-gold/50 blur-3xl" />
      <svg viewBox="0 0 200 230" className="relative w-full overflow-visible" aria-hidden>
        <defs>
          <pattern id={pat} width="12" height="12" patternUnits="userSpaceOnUse"><g opacity="0.22">{motif}</g></pattern>
          <pattern id={patL} href={`#${pat}`} patternTransform="skewY(26.57)" />
          <pattern id={patR} href={`#${pat}`} patternTransform="skewY(-26.57)" />
          <linearGradient id={top} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--snow)" stopOpacity="0.34" />
            <stop offset="0.6" stopColor="var(--snow)" stopOpacity="0.06" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id={bow} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--snow)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.25" />
          </linearGradient>
          <filter id={blur} x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <ellipse cx="100" cy="206" rx="80" ry="15" fill="var(--ink)" opacity="0.45" filter={`url(#${blur})`} />
        {/* box body */}
        <polygon points="30,105 100,140 100,205 30,170" fill={bg} />
        <polygon points="30,105 100,140 100,205 30,170" fill={`url(#${patL})`} />
        <polygon points="100,140 170,105 170,170 100,205" fill={bg} />
        <polygon points="100,140 170,105 170,170 100,205" fill={`url(#${patR})`} />
        <polygon points="58,119 72,126 72,191 58,184" fill={rib} />
        <polygon points="128,126 142,119 142,184 128,191" fill={rib} />
        <polygon points="30,105 100,140 100,205 30,170" fill="var(--ink)" opacity="0.24" />
        <polygon points="100,140 170,105 170,170 100,205" fill="var(--ink)" opacity="0.07" />
        <line x1="100" y1="140" x2="100" y2="205" stroke="var(--snow)" strokeOpacity="0.25" />
        {/* inside, revealed when the lid flies off */}
        <polygon points="30,105 100,70 170,105 100,140" fill="var(--ink)" opacity="0.55" />
        <polygon points="30,105 100,70 170,105 100,140" fill={bg} opacity="0.35" />
        {/* lid */}
        <g className="gift-lid">
          <polygon points="24,92 100,130 100,148 24,110" fill={bg} />
          <polygon points="100,130 176,92 176,110 100,148" fill={bg} />
          <polygon points="55.7,107.9 68.3,114.1 68.3,132.1 55.7,125.9" fill={rib} />
          <polygon points="131.7,114.1 144.3,107.9 144.3,125.9 131.7,132.1" fill={rib} />
          <polygon points="24,92 100,130 100,148 24,110" fill="var(--ink)" opacity="0.3" />
          <polygon points="100,130 176,92 176,110 100,148" fill="var(--ink)" opacity="0.12" />
          <polygon points="24,92 100,54 176,92 100,130" fill={bg} />
          <polygon points="24,92 100,54 176,92 100,130" fill={`url(#${pat})`} />
          <polygon points="55.7,76.1 68.3,69.9 144.3,107.9 131.7,114.1" fill={rib} />
          <polygon points="131.7,69.9 144.3,76.1 68.3,114.1 55.7,107.9" fill={rib} />
          <polygon points="24,92 100,54 176,92 100,130" fill={`url(#${top})`} />
          <polyline points="24,92 100,54 176,92" fill="none" stroke="var(--snow)" strokeOpacity="0.35" />
          {/* bow */}
          <g className="gift-bow">
            <path d="M100 90 L86 118 L92 115 L94 123 L101 96Z" fill={rib} />
            <path d="M100 90 L114 116 L108 114 L106 122 L99 96Z" fill={rib} />
            <path d="M100 90 C82 58 50 66 64 86 C72 97 90 96 100 90Z" fill={rib} />
            <path d="M100 90 C118 58 150 66 136 86 C128 97 110 96 100 90Z" fill={rib} />
            <path d="M100 90 C82 58 50 66 64 86 C72 97 90 96 100 90Z" fill={`url(#${bow})`} />
            <path d="M100 90 C118 58 150 66 136 86 C128 97 110 96 100 90Z" fill={`url(#${bow})`} />
            <path d="M97 88 C86 74 70 72 70 80" fill="none" stroke="var(--ink)" strokeOpacity="0.25" strokeWidth="1.5" />
            <path d="M103 88 C114 74 130 72 130 80" fill="none" stroke="var(--ink)" strokeOpacity="0.25" strokeWidth="1.5" />
            <ellipse cx="100" cy="90" rx="9" ry="7" fill={rib} />
            <ellipse cx="98" cy="88" rx="4" ry="2.5" fill="var(--snow)" opacity="0.45" />
          </g>
        </g>
      </svg>
      <div className="gift-pop pointer-events-none absolute left-1/2 top-[18%] w-[38%]">
        <OrnamentIcon kind={project.ornament} className="w-full drop-shadow-xl" />
      </div>
    </div>
  );
}
