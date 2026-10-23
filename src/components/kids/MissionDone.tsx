import type { ReactNode } from "react";
import { Award, Home } from "lucide-react";
import type { MissionId } from "@/lib/kids-academy";
import { Medal } from "./KidsArt";
import { PrimaryButton, RetryLink } from "./Kit";

/** Shared end screen: medal, what the child learned, and the way to the diploma. Never a score. */
export function MissionDone({ mission, title, lessons, extra, onDiploma, onExit, onRetry }: {
  mission: MissionId; title: string; lessons: string[]; extra?: ReactNode; onDiploma: () => void; onExit: () => void; onRetry: () => void;
}) {
  return (
    <section className="animate-rise mx-auto max-w-3xl px-4 pt-6 text-center" data-testid="mission-done">
      <div className="relative mx-auto w-36">
        <div className="absolute inset-0 rounded-full bg-gold/40 blur-2xl" />
        <Medal mission={mission} className="animate-floaty relative w-36" />
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Missione compiuta</p>
      <h2 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">{title}</h2>
      <div className="mx-auto mt-6 max-w-xl rounded-3xl bg-paper p-5 text-left text-ink shadow-deep">
        <p className="font-display text-xl">Oggi hai imparato che…</p>
        <ul className="mt-3 space-y-2.5">
          {lessons.map((l, i) => (
            <li key={l} className="flex gap-3 text-base leading-snug">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>{l}
            </li>
          ))}
        </ul>
      </div>
      {extra}
      <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <PrimaryButton onClick={onDiploma}><Award className="h-6 w-6" /> Vedi il tuo diploma</PrimaryButton>
        <button type="button" onClick={onExit} className="glass inline-flex min-h-14 items-center gap-2 rounded-full px-6 font-semibold"><Home className="h-5 w-5" /> Altre missioni</button>
      </div>
      <div className="mt-4"><RetryLink onClick={onRetry} /></div>
    </section>
  );
}
