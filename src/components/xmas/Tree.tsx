import { OrnamentIcon } from "./Ornament";
import type { TreeOrnament } from "@/lib/data";

const LIGHTS = Array.from({ length: 46 }).map((_, i) => {
  const r = (s: number) => {
    const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5;
    return v - Math.floor(v);
  };
  const y = 14 + r(1) * 74;
  const half = ((y - 10) / 80) * 34;
  return { x: 50 + (r(2) * 2 - 1) * half * 0.9, y, d: r(3) * 3 };
});

/** Pseudo-3D CSS tree: layered tiers + sway + lights + ornaments with flip. */
export function Tree({
  ornaments,
  focusId,
  flippedId,
  arrivingId,
  onPick,
}: {
  ornaments: TreeOrnament[];
  focusId?: number | string | null | undefined;
  flippedId?: number | string | null | undefined;
  arrivingId?: number | string | null | undefined;
  onPick?: (o: TreeOrnament) => void;
}) {
  const tiers = [
    { top: 10, h: 30, w: 38 },
    { top: 24, h: 34, w: 54 },
    { top: 40, h: 36, w: 70 },
    { top: 56, h: 36, w: 86 },
  ];
  return (
    <div className="relative h-full w-full [perspective:1200px]">
      {/* glow */}
      <div className="absolute left-1/2 top-[55%] h-[70%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/15 blur-3xl" />
      <div className="animate-sway3d absolute inset-0 [transform-style:preserve-3d]">
        {/* back layer depth */}
        {tiers.map((t, i) => (
          <div
            key={`b${i}`}
            className="absolute"
            style={{
              top: `${t.top}%`,
              height: `${t.h}%`,
              width: `${t.w}%`,
              clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
              background: "linear-gradient(180deg, var(--fir-deep), oklch(0.2 0.05 160))",
              transform: "translateZ(-40px) scale(1.06)",
              left: `${50 - t.w / 2}%`,
            }}
          />
        ))}
        {tiers.map((t, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${t.top}%`,
              height: `${t.h}%`,
              width: `${t.w}%`,
              left: `${50 - t.w / 2}%`,
              clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
              background:
                "radial-gradient(ellipse at 35% 80%, oklch(0.5 0.1 150 / 70%), transparent 55%), linear-gradient(100deg, oklch(0.3 0.08 158) 0%, var(--fir) 45%, oklch(0.26 0.07 158) 100%)",
              transform: "translateZ(0)",
            }}
          >
            <div className="absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-snow/25 to-transparent" />
          </div>
        ))}
        {/* trunk */}
        <div className="absolute left-1/2 top-[91%] h-[7%] w-[8%] -translate-x-1/2 rounded-b-md" style={{ background: "linear-gradient(90deg, oklch(0.3 0.05 50), oklch(0.42 0.06 55), oklch(0.28 0.05 50))" }} />
        {/* star */}
        <div className="absolute left-1/2 top-[3%] w-[11%] -translate-x-1/2 animate-floaty" style={{ transform: "translateZ(30px)" }}>
          <svg viewBox="0 0 50 50" className="w-full drop-shadow-[0_0_14px_var(--gold)]">
            <path d="M25 2 L31 18 L48 19 L35 30 L39 47 L25 37 L11 47 L15 30 L2 19 L19 18Z" fill="var(--gold)" />
          </svg>
        </div>
        {/* garland */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ transform: "translateZ(10px)" }}>
          {([[38, 32, 60, 37], [32, 50, 68, 55], [24, 68, 76, 72], [16, 86, 84, 89]] as const).map(([x1, y1, x2, y2], i) => (
            <path key={i} d={`M${x1} ${y1} Q50 ${y2 + 6} ${x2} ${y2}`} stroke="var(--gold)" strokeOpacity="0.55" strokeWidth="0.35" fill="none" strokeDasharray="1 0.8" />
          ))}
        </svg>
        {/* lights */}
        {LIGHTS.map((l, i) => (
          <span
            key={i}
            className="animate-twinkle absolute h-[1.1%] w-[1.1%] rounded-full bg-gold"
            style={{ left: `${l.x}%`, top: `${l.y}%`, animationDelay: `${l.d}s`, boxShadow: "0 0 8px 2px var(--gold)", transform: "translateZ(15px)" }}
          />
        ))}
        {/* ornaments */}
        {ornaments.map((o) => {
          const focus = focusId === o.id;
          const flipped = flippedId === o.id;
          const arriving = arrivingId === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onPick?.(o)}
              tabIndex={onPick ? 0 : -1}
              aria-label={o.dedica ? `Addobbo con dedica` : "Addobbo"}
              className={`flip-card absolute w-[9%] -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${arriving ? "animate-arrive" : ""}`}
              style={{
                left: `${o.x}%`,
                top: `${o.y}%`,
                transform: `translate(-50%,-50%) translateZ(${focus ? 120 : 25}px) scale(${focus ? 2.3 : 1})`,
                zIndex: focus ? 30 : 10,
                cursor: onPick ? "pointer" : "default",
              }}
            >
              <div className={`flip-inner relative aspect-[64/72] w-full ${flipped ? "is-flipped" : ""}`}>
                <div className="flip-face absolute inset-0">
                  <OrnamentIcon kind={o.kind} className={`h-full w-full ${focus ? "drop-shadow-[0_0_12px_var(--gold)]" : "drop-shadow-lg"}`} />
                </div>
                <div className="flip-face flip-back absolute inset-0 flex items-center justify-center">
                  <div className="absolute left-1/2 top-1/2 w-[260%] -translate-x-1/2 -translate-y-1/2 rounded-lg border hairline-gold bg-paper p-[8%] text-center text-ink shadow-deep">
                    <p className="font-display text-[0.5em] italic leading-snug">“{o.dedica ?? "Un regalo per Monza"}”</p>
                    <p className="mt-1 text-[0.4em] font-semibold text-primary">— {o.firma ?? "Anonimo"}</p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {/* snow ground */}
      <div className="absolute bottom-0 left-1/2 h-[6%] w-[95%] -translate-x-1/2 rounded-[50%] bg-snow/15 blur-md" />
    </div>
  );
}
