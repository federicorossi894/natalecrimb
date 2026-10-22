import { useState } from "react";
import { CriMark, OrnamentIcon } from "./Ornament";
import { Snow } from "./Snow";
import type { Project } from "@/lib/data";
import { projectUrl } from "@/lib/postcard-share";
import { EMAIL_SENDER, deliveryLabel, type EmailMode } from "@/lib/email-demo";

/** Gift-wrapped postcard themed per project (front) with handwritten-style back. */
export function Postcard({ project, to, from, msg }: { project: Project; to: string; from: string; msg: string }) {
  const [back, setBack] = useState(false);
  const t = project.theme;
  const ribbon = { background: `var(${t.ribbon})` };
  return (
    <div>
      <button type="button" aria-label="Gira la cartolina" aria-pressed={back} className="flip-card mx-auto block aspect-[3/2] w-full max-w-lg cursor-pointer rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setBack(!back)}>
        <div className={`flip-inner relative h-full w-full ${back ? "is-flipped" : ""}`}>
          <div className="flip-face absolute inset-0 overflow-hidden rounded-2xl shadow-deep" style={{ background: `radial-gradient(ellipse at 30% 20%, color-mix(in oklab, var(${t.bg}) 80%, var(--snow)), var(${t.bg}) 60%)`, color: `var(${t.ink})` }}>
            <Snow count={18} />
            <div className="absolute inset-y-0 right-[22%] w-[7%] shadow-deep" style={ribbon} />
            <div className="absolute inset-x-0 top-[24%] h-[7%] shadow-deep" style={ribbon} />
            <svg viewBox="0 0 100 60" className="absolute right-[13.5%] top-[16.5%] w-[24%] drop-shadow-lg" aria-hidden>
              <path d="M50 30 C30 0 4 8 12 28 C18 44 40 38 50 30Z" fill={`var(${t.ribbon})`} />
              <path d="M50 30 C70 0 96 8 88 28 C82 44 60 38 50 30Z" fill={`var(${t.ribbon})`} />
              <path d="M50 30 L37 58 M50 30 L63 58" stroke={`var(${t.ribbon})`} strokeWidth="7" />
              <circle cx="50" cy="30" r="8" fill={`var(${t.ribbon})`} stroke="var(--ink)" strokeOpacity="0.2" />
            </svg>
            <div className="absolute left-[5%] top-[6%] max-w-[64%]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 sm:text-[11px]">Il Natale che fa bene</p>
            </div>
            <div className="absolute left-[5%] top-[36%] max-w-[64%]">
              <p className="font-display text-xl leading-tight sm:text-3xl">Per te, {to || "…"}</p>
              <p className="mt-1 font-display text-base italic opacity-90 sm:text-xl">{project.title}</p>
            </div>
            <OrnamentIcon kind={project.ornament} className="animate-floaty absolute right-[20.5%] top-[46%] w-[10%]" />
            <div className="absolute bottom-[5%] left-[4%] right-[4%] flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-ink">
              <CriMark variant="red" className="h-7 sm:h-9" />
              <span className="text-right text-[9px] font-semibold uppercase leading-tight tracking-widest opacity-70 sm:text-[10px]">Comitato di Monza<br />Cartolina DEMO</span>
            </div>
          </div>
          <div className="flip-face flip-back absolute inset-0 grid grid-cols-[1.3fr_1fr] gap-3 rounded-lg bg-paper p-3 text-ink shadow-deep sm:gap-4 sm:p-5">
            <div className="border-r border-ink/15 pr-4">
              <p className="font-display text-xs italic leading-snug sm:text-lg">“{msg || project.postcardLine}”</p>
              <p className="mt-3 text-sm font-semibold text-primary">— {from || "Un amico"}</p>
              <p className="mt-3 text-[10px] leading-snug opacity-70">Regalo DEMO <strong>“{project.title}”</strong> per Croce Rossa Italiana – Comitato di Monza. Nessuna donazione reale.</p>
              <p className="mt-1 break-all text-[9px] opacity-60">{projectUrl(project).replace("https://", "")}</p>
            </div>
            <div className="flex flex-col justify-between">
              <div className="ml-auto flex h-16 w-14 items-center justify-center border-2 border-dashed" style={{ borderColor: `var(${t.bg})` }}><OrnamentIcon kind={project.ornament} className="w-9" /></div>
              <div className="space-y-3 text-sm">
                <p className="border-b border-ink/30 pb-1 font-display">{to || "Destinatario"}</p>
                <p className="border-b border-ink/30 pb-1 text-xs opacity-60">Monza · Natale 2026</p>
              </div>
            </div>
          </div>
        </div>
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">Tocca per girarla · Cartolina DEMO</p>
    </div>
  );
}

export function EmailPreview({ project, donor, to, msg, mode = "christmas" }: { project: Project; donor: string; to: string; msg: string; mode?: EmailMode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-paper text-ink shadow-deep">
      <div className="border-b border-ink/10 bg-paper px-4 py-3 text-xs">
        <p><span className="opacity-60">Da:</span> Croce Rossa Monza &lt;{EMAIL_SENDER}&gt; <span className="opacity-50">(demo)</span></p>
        <p><span className="opacity-60">A:</span> {to || "destinatario"}</p>
        <p><span className="opacity-60">Consegna:</span> {deliveryLabel(mode)}</p>
        <p className="mt-1 font-semibold">🎄 {donor || "Qualcuno"} ti ha lasciato qualcosa sotto l'albero di Monza</p>
      </div>
      <div className="relative overflow-hidden bg-fir-deep px-6 py-10 text-center text-snow">
        <Snow count={30} />
        <CriMark className="mx-auto h-14" />
        <OrnamentIcon kind={project.ornament} className="animate-floaty mx-auto mt-6 w-20" />
        <p className="mt-4 font-display text-2xl leading-tight">{mode === "christmas" ? <>Buon Natale!<br />C'è un regalo per te sotto l'Albero di Monza</> : <>C'è un regalo per te<br />sotto l'Albero di Monza</>}</p>
      </div>
      <div className="px-6 py-6 text-sm leading-relaxed">
        <p>Ciao,</p>
        <p className="mt-3"><strong>{donor || "Qualcuno che ti vuole bene"}</strong> ha fatto a tuo nome il regalo <strong className="text-primary">“{project.title}”</strong> per Croce Rossa Italiana – Comitato di Monza. {project.tagline}</p>
        {msg && <blockquote className="mt-4 border-l-4 border-primary pl-4 font-display italic">“{msg}”</blockquote>}
        <div className="mt-6 text-center">
          <span className="inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Scopri il tuo regalo</span>
        </div>
        <p className="mt-6 text-center text-[11px] opacity-60">Il tuo addobbo è appeso all'Albero di Monza · Piazza San Paolo<br />Anteprima demo · nessuna email viene inviata</p>
      </div>
    </div>
  );
}
