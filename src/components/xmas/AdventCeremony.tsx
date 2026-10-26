import { AdventScene, SEDE_SRC, type DoorState } from "./AdventScene";
import { CriLockup } from "./Ornament";
import { adventCamera } from "@/lib/advent-layout";
import type { Door } from "@/lib/kindness";

/**
 * The daily 12:00 moment on the casetta screen, driven by elapsed time so the preview can pause it or jump to a phase:
 * the sede lights up → the camera moves to the day's plaque → it swings open with warm light → the message → fade out.
 * With reduced motion there is no camera move and no swing, only fades.
 */
export type CeremonyPhase = "dark" | "lit" | "focus" | "open" | "message" | "out";
type Step = { id: CeremonyPhase; at: number };
export const CEREMONY_STEPS: Step[] = [
  { id: "dark", at: 0 }, { id: "lit", at: 600 }, { id: "focus", at: 3400 }, { id: "open", at: 6400 }, { id: "message", at: 8000 }, { id: "out", at: 22000 },
];
export const CEREMONY_MS = 23600;
export const REDUCED_STEPS: Step[] = [{ id: "dark", at: 0 }, { id: "lit", at: 400 }, { id: "message", at: 3000 }, { id: "out", at: 15000 }];
export const REDUCED_MS = 16400;

export const ceremonySteps = (reduced: boolean) => (reduced ? REDUCED_STEPS : CEREMONY_STEPS);
export const ceremonyLength = (reduced: boolean) => (reduced ? REDUCED_MS : CEREMONY_MS);
export function ceremonyPhaseAt(ms: number, reduced: boolean): CeremonyPhase {
  let phase: CeremonyPhase = "dark";
  for (const s of ceremonySteps(reduced)) if (ms >= s.at) phase = s.id;
  return phase;
}

export function AdventCeremony({ day, door, demo, reduced, elapsed }: { day: number; door: Door; demo: boolean; reduced: boolean; elapsed: number }) {
  const phase = ceremonyPhaseAt(elapsed, reduced);
  const cam = adventCamera(day);
  const zoomed = !reduced && (phase === "focus" || phase === "open" || phase === "message");
  const isOpen = phase === "open" || phase === "message" || phase === "out";
  // Earlier days have already been opened on previous noons; later ones are still closed.
  const state = (d: number): DoorState => (d < day ? "opened" : d > day ? "locked" : isOpen ? "opened" : "today");
  const long = (door.message?.length ?? 0) > 210;

  return (
    <div className={`tv-adv is-${phase} ${reduced ? "is-reduced" : ""}`} data-testid="tv-advent" data-phase={phase} data-day={day} aria-live="polite">
      <img className="tv-adv-backdrop" src={SEDE_SRC} alt="" aria-hidden />
      <div
        className="tv-adv-stage"
        style={{ transform: zoomed ? `translate(${cam.dx.toFixed(3)}cqw, ${cam.dy.toFixed(3)}cqw) scale(${cam.k})` : "none" }}
      >
        <AdventScene tv state={state} opening={!reduced && phase === "open" ? day : null} />
      </div>
      <div className="tv-adv-night" aria-hidden />
      <div className={`tv-adv-shade is-${cam.panel}`} aria-hidden />

      <header className="tv-adv-head">
        <CriLockup className="h-[4.2cqw]" />
        <p className="mt-[0.9cqw] text-[1.25cqw] font-semibold uppercase tracking-[0.16em] text-gold">Calendario della Gentilezza · ore 12:00</p>
      </header>

      <div className={`tv-adv-note is-${cam.panel}`} data-testid="tv-advent-note">
        {demo && <span className="tv-adv-demo">Esempio · DEMO</span>}
        <p className="text-[1.3cqw] font-semibold uppercase tracking-[0.16em] text-burgundy">{day} dicembre · Gesto del giorno</p>
        <p className="mt-[0.9cqw] font-display text-[3.1cqw] leading-[1.08]">{door.title ?? "La finestrella di oggi"}</p>
        {door.message && <p className={`mt-[1.1cqw] leading-[1.38] ${long ? "text-[1.7cqw]" : "text-[2cqw]"}`}>{door.message}</p>}
        <p className="tv-adv-foot">Croce Rossa Italiana – Comitato di Monza</p>
      </div>
    </div>
  );
}
