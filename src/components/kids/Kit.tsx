import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, RotateCcw, Volume2, VolumeX, AudioLines } from "lucide-react";
import { Snow } from "@/components/xmas/Snow";
import { ACADEMY_KEY, EMPTY_ACADEMY, HELPERS, helperLead, parseAcademy, type AcademyState, type HelperId } from "@/lib/kids-academy";
import { HelperBadge } from "./KidsArt";

/** Progress lives only in this device's storage (read after hydration, so SSR and client markup match). */
export function useAcademy() {
  const [state, setState] = useState<AcademyState>(EMPTY_ACADEMY);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { setState(parseAcademy(localStorage.getItem(ACADEMY_KEY))); } catch { /* storage blocked: play without saving */ }
    setReady(true);
  }, []);
  const [dirty, setDirty] = useState(false);
  const update = useCallback((fn: (s: AcademyState) => AcademyState) => { setState(fn); setDirty(true); }, []);
  // Persist after the state has settled (never inside the updater, which React may call twice).
  useEffect(() => {
    if (!dirty) return;
    try { localStorage.setItem(ACADEMY_KEY, JSON.stringify(state)); } catch { /* storage blocked: progress lasts for this visit */ }
  }, [state, dirty]);
  return { state, update, ready };
}

/** Tiny synthesized sounds (no files). Off by default; nothing plays until the child turns sound on. */
export function useChimes(on: boolean) {
  const ctx = useRef<AudioContext | null>(null);
  return useCallback((kind: "ok" | "soft" | "tick" | "tada") => {
    if (!on || typeof window === "undefined") return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx.current ??= new AC();
    const c = ctx.current;
    const notes = kind === "ok" ? [660, 880] : kind === "tada" ? [523, 659, 784, 1046] : kind === "tick" ? [440] : [330];
    notes.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.11;
      o.type = kind === "tick" ? "sine" : "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === "tick" ? 0.12 : 0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "tick" ? 0.08 : 0.28));
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.3);
    });
  }, [on]);
}

export function SoundToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} aria-pressed={on} className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold">
      {on ? <Volume2 className="h-5 w-5 text-gold" /> : <VolumeX className="h-5 w-5" />}
      {on ? "Suoni accesi" : "Suoni spenti"}
    </button>
  );
}

/** Optional read-aloud for younger children (device voice, Italian). Hidden where unsupported. */
export function ListenButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(typeof window !== "undefined" && "speechSynthesis" in window); return () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }; }, []);
  if (!ok) return null;
  const say = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "it-IT"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };
  return (
    <button type="button" onClick={say} className="inline-flex min-h-11 items-center gap-2 rounded-full border hairline-gold px-4 text-sm font-semibold text-gold">
      <AudioLines className="h-5 w-5" /> Ascolta
    </button>
  );
}

export function MissionTop({ n, title, step, steps, sound, setSound, onExit }: { n: number; title: string; step: number; steps: number; sound: boolean; setSound: (v: boolean) => void; onExit: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="inline-flex min-h-11 items-center gap-2 rounded-full pr-3 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /> Torna all'Accademia</button>
        <SoundToggle on={sound} onChange={setSound} />
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Missione {n}</p>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">{title}</h1>
        </div>
        <ol className="flex gap-1.5" aria-label={`Tappa ${Math.min(step + 1, steps)} di ${steps}`}>
          {Array.from({ length: steps }, (_, i) => (
            <li key={i} className={`h-2.5 rounded-full transition-all ${i < step ? "w-6 bg-gold" : i === step ? "w-10 bg-gold/70" : "w-6 bg-muted"}`} />
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Illustrated scene with gentle drift + snow; `resolved` washes it with warm light and shows the outcome caption. */
export function SceneImage({ src, alt, resolved, caption, children }: { src: string; alt: string; resolved?: boolean; caption?: ReactNode; children?: ReactNode }) {
  return (
    <figure className="relative overflow-hidden rounded-[1.75rem] border hairline-gold shadow-deep">
      <img src={src} alt={alt} width={1280} height={800} className="kid-drift aspect-[16/10] w-full object-cover" />
      <Snow count={18} />
      {resolved && <div className="kid-glow pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,oklch(0.83_0.12_80/45%),transparent_70%)]" />}
      {caption && (
        <figcaption className="animate-rise absolute inset-x-3 bottom-3 rounded-2xl bg-paper/95 p-3 text-sm font-semibold text-ink shadow-deep sm:inset-x-5 sm:bottom-5 sm:p-4 sm:text-base">{caption}</figcaption>
      )}
      {children}
    </figure>
  );
}

export type ChoiceState = "idle" | "wrong" | "right";
export function ChoiceCard({ icon, label, state, onPick, disabled }: { icon: ReactNode; label: string; state: ChoiceState; onPick: () => void; disabled?: boolean }) {
  const cls = state === "right" ? "border-gold bg-secondary" : state === "wrong" ? "opacity-55" : "glass hover:border-gold";
  return (
    <button type="button" onClick={onPick} disabled={disabled || state === "wrong"} aria-pressed={state === "right"}
      className={`flex min-h-[76px] w-full items-center gap-4 rounded-3xl border p-3 pr-5 text-left transition active:scale-[0.98] ${cls} ${state === "wrong" ? "kid-shake" : ""}`}>
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${state === "right" ? "bg-gold text-ink" : "bg-primary text-primary-foreground"}`}>{state === "right" ? <Check className="h-7 w-7" /> : icon}</span>
      <span className="text-lg font-semibold leading-snug">{label}</span>
    </button>
  );
}

/** The guide the child picked in the Academy hub (stored on the device only, never a name). */
const HelperContext = createContext<HelperId>("stella");
export function HelperProvider({ helper, children }: { helper: HelperId; children: ReactNode }) {
  return <HelperContext.Provider value={helper}>{children}</HelperContext.Provider>;
}
export const useHelper = () => useContext(HelperContext);
export const helperName = (id: HelperId) => HELPERS.find((h) => h.id === id)?.name ?? "Stellina";

let leadTurn = 0;

/**
 * Feedback spoken by the chosen guide: avatar + speech balloon with a short, warm opener, then the lesson.
 * Announced to screen readers as "<guide>: …". Scrolls into view only when the message changes.
 */
export function Bubble({ tone, children, lead = true }: { tone: "kind" | "great"; children: ReactNode; lead?: boolean }) {
  const helper = useHelper();
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef("");
  const key = typeof children === "string" ? children : "";
  // Opener rotates per new message, so the guide does not repeat the same exclamation every time.
  const opener = useMemo(() => (lead ? helperLead(helper, tone, leadTurn++) : ""), [helper, tone, key, lead]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const text = ref.current?.textContent ?? "";
    if (text === last.current) return;
    last.current = text;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  });
  return (
    <div ref={ref} role="status" aria-live="polite" className="animate-rise flex scroll-mb-40 scroll-mt-28 items-end gap-2.5" data-testid="helper-says" data-helper={helper}>
      <HelperBadge id={helper} className={`h-14 w-14 shrink-0 drop-shadow-lg ${tone === "great" ? "kid-bump" : ""}`} />
      <div className={`helper-balloon relative min-w-0 flex-1 rounded-3xl rounded-bl-md p-4 text-base leading-relaxed ${tone === "great" ? "bg-paper text-ink" : "border hairline-gold bg-card"}`}>
        <span className={`block text-[11px] font-semibold uppercase tracking-widest ${tone === "great" ? "text-primary" : "text-gold"}`}>{helperName(helper)}<span className="sr-only"> dice:</span></span>
        {opener && <strong className="block font-display text-lg leading-snug">{opener}</strong>}
        <span className="block">{children}</span>
      </div>
    </div>
  );
}

/** One-line version for live moments (dragging, tapping the rhythm): no scrolling, no interruption. */
export function HelperLine({ children, tone = "kind", className = "" }: { children: ReactNode; tone?: "kind" | "great"; className?: string }) {
  const helper = useHelper();
  return (
    <p className={`flex items-center justify-center gap-2 text-sm font-semibold leading-snug ${tone === "great" ? "text-gold" : ""} ${className}`} data-testid="helper-line" data-helper={helper}>
      <HelperBadge id={helper} className="h-9 w-9 shrink-0" />
      <span className="min-w-0 text-left"><span className="sr-only">{helperName(helper)}: </span>{children}</span>
    </p>
  );
}

export function PrimaryButton({ children, onClick, className = "" }: { children: ReactNode; onClick: () => void; className?: string }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-lg font-semibold text-primary-foreground shadow-deep transition active:scale-[0.98] ${className}`}>{children}</button>;
}

export function RetryLink({ onClick, children = "Rigioca la missione" }: { onClick: () => void; children?: ReactNode }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"><RotateCcw className="h-4 w-4" /> {children}</button>;
}
