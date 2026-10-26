import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import sede from "@/assets/sede-cri-monza-natale.png.asset.json";
import { PLAQUES, pct } from "@/lib/advent-layout";
import { cn } from "@/lib/utils";

/** Approved illustration of the CRI Monza sede, shown untouched (no numbers baked in). */
export const SEDE_SRC = sede.url;
export const SEDE_ALT = "La sede della Croce Rossa Italiana – Comitato di Monza addobbata per Natale, con ambulanza e moto di soccorso sotto la neve";

export type DoorState = "locked" | "available" | "today" | "opened";

/**
 * The 24 plaques of the Calendario della Gentilezza, positioned in percentages of the 3:2 illustration so they
 * never drift from their window or door when the screen size changes. Interactive (buttons) when onSelect is set,
 * decorative otherwise (TV). Opening a plaque swings it on a hinge and lets the illustration show through.
 */
export function AdventScene({
  state, onSelect, label, opening = null, className, children, tv = false,
}: {
  state: (day: number) => DoorState;
  onSelect?: (day: number) => void;
  label?: (day: number, s: DoorState) => string;
  opening?: number | null;
  className?: string;
  children?: ReactNode;
  tv?: boolean;
}) {
  return (
    <div className={cn("advent-sede", tv && "is-tv", className)} data-testid="advent-sede">
      <img src={SEDE_SRC} alt={onSelect ? SEDE_ALT : ""} className="advent-sede-img" draggable={false} decoding="async" />
      {PLAQUES.map((p) => {
        const s = state(p.day);
        const cls = cn("advent-plaque", `is-${s}`, opening === p.day && "is-opening");
        const style = { left: pct(p.left), top: pct(p.top), width: pct(p.width), height: pct(p.height) };
        const inner = (
          <>
            <span className="advent-plaque-glow" aria-hidden />
            {opening === p.day && <span className="advent-plaque-sparks" aria-hidden><i /><i /><i /><i /><i /><i /></span>}
            <span className="advent-plaque-leaf" aria-hidden><span className="advent-plaque-num">{p.day}</span></span>
            {s === "opened" && <span className="advent-plaque-tag" aria-hidden>{p.day}</span>}
            {s === "locked" && <span className="advent-plaque-lock" aria-hidden><Lock /></span>}
          </>
        );
        return onSelect ? (
          <button
            key={p.day}
            type="button"
            className={cls}
            style={style}
            data-day={p.day}
            data-state={s}
            aria-disabled={s === "locked" || undefined}
            aria-label={label?.(p.day, s) ?? `Finestrella ${p.day}`}
            onClick={() => onSelect(p.day)}
          >
            {inner}
          </button>
        ) : (
          <span key={p.day} className={cls} style={style} data-day={p.day} data-state={s}>{inner}</span>
        );
      })}
      {children}
    </div>
  );
}
