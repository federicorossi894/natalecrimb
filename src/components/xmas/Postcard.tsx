import { useState } from "react";
import { CriMark, OrnamentIcon } from "./Ornament";
import { Snow } from "./Snow";
import type { Project } from "@/lib/data";
import heroImg from "@/assets/hero-piazza.jpg";

export function Postcard({ project, to, from, msg }: { project: Project; to: string; from: string; msg: string }) {
  const [back, setBack] = useState(false);
  return (
    <div>
      <div className="flip-card mx-auto aspect-[3/2] w-full max-w-lg cursor-pointer" onClick={() => setBack(!back)}>
        <div className={`flip-inner relative h-full w-full ${back ? "is-flipped" : ""}`}>
          <div className="flip-face absolute inset-0 overflow-hidden rounded-2xl shadow-deep">
            <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            <Snow count={25} />
            <div className="absolute right-4 top-4"><CriMark className="h-9 w-9" /></div>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Buon Natale da Monza</p>
                <p className="font-display text-2xl leading-tight sm:text-3xl">Per te, {to || "…"},<br />un regalo che fa bene.</p>
              </div>
              <OrnamentIcon kind={project.ornament} className="animate-floaty w-14 shrink-0" />
            </div>
          </div>
          <div className="flip-face flip-back absolute inset-0 grid grid-cols-[1.3fr_1fr] gap-4 rounded-2xl bg-paper p-5 text-ink shadow-deep">
            <div className="border-r border-ink/15 pr-4">
              <p className="font-display text-base italic leading-snug sm:text-lg">“{msg || "Il tuo messaggio apparirà qui."}”</p>
              <p className="mt-3 text-sm font-semibold text-primary">— {from || "Un amico"}</p>
              <p className="mt-4 text-[11px] leading-snug opacity-70">A tuo nome è stato fatto il regalo <strong>“{project.title}”</strong> per Croce Rossa Italiana – Comitato di Monza.</p>
            </div>
            <div className="flex flex-col justify-between">
              <div className="ml-auto flex h-16 w-14 items-center justify-center border-2 border-dashed border-primary/60"><CriMark className="h-9 w-9" /></div>
              <div className="space-y-3 text-sm">
                <p className="border-b border-ink/30 pb-1 font-display">{to || "Destinatario"}</p>
                <p className="border-b border-ink/30 pb-1 text-xs opacity-60">Monza · Natale 2026</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Tocca la cartolina per girarla</p>
    </div>
  );
}

export function EmailPreview({ project, donor, to, msg }: { project: Project; donor: string; to: string; msg: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-paper text-ink shadow-deep">
      <div className="border-b border-ink/10 bg-paper px-4 py-3 text-xs">
        <p><span className="opacity-60">Da:</span> Croce Rossa Monza &lt;natale@crimonza.org&gt; <span className="opacity-50">(demo)</span></p>
        <p><span className="opacity-60">A:</span> {to || "destinatario"}</p>
        <p className="mt-1 font-semibold">🎄 {donor || "Qualcuno"} ti ha lasciato qualcosa sotto l'albero di Monza</p>
      </div>
      <div className="relative overflow-hidden bg-fir-deep px-6 py-10 text-center text-snow">
        <Snow count={30} />
        <CriMark className="mx-auto h-10 w-10" />
        <OrnamentIcon kind={project.ornament} className="animate-floaty mx-auto mt-6 w-20" />
        <p className="mt-4 font-display text-2xl leading-tight">C'è un regalo per te<br />sotto l'Albero di Monza</p>
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
