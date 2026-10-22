import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Check, Gift, MapPin, Pencil, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/xmas/Shell";
import { SantaScene } from "@/components/xmas/SantaChimney";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { PROJECTS } from "@/lib/data";
import {
  SANTA_CONTRIBUTION_EUR, SANTA_CONTRIBUTION_NOTE, SANTA_REFERENCES, SANTA_SLOTS,
  emptySantaForm, santaBookingSchema, type SantaForm,
} from "@/lib/santa";

export const Route = createFileRoute("/babbo-natale")({
  head: () => ({
    meta: [
      { title: "Prenota il tuo Babbo Natale – CRI Monza · DEMO" },
      { name: "description", content: "La sera della Vigilia i volontari CRI vestiti da Babbo Natale portano a casa i regali preparati dalla famiglia. Prenotazione dimostrativa, servizio in definizione." },
      { property: "og:title", content: "Prenota il tuo Babbo Natale 🎅 – CRI Monza" },
      { property: "og:description", content: "Una sorpresa a domicilio la sera della Vigilia. Prenotazione solo dimostrativa, servizio in definizione." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Babbo,
});

type Stage = "form" | "review" | "done";
const inp = "glass mt-1.5 w-full rounded-2xl px-4 py-3.5 text-base normal-case tracking-normal text-foreground outline-none focus:border-gold aria-[invalid=true]:border-primary";
const lbl = "block text-xs font-semibold uppercase tracking-widest text-muted-foreground";

function Babbo() {
  const [stage, setStage] = useState<Stage>("form");
  const [form, setForm] = useState<SantaForm>(emptySantaForm);
  const [errors, setErrors] = useState<Partial<Record<keyof SantaForm, string>>>({});
  const [proj, setProj] = useState<string | null>(null);
  const set = <K extends keyof SantaForm>(k: K, v: SantaForm[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const top = () => document.getElementById("prenota")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const review = () => {
    const r = santaBookingSchema.safeParse(form);
    if (!r.success) {
      const next: Partial<Record<keyof SantaForm, string>> = {};
      for (const i of r.error.issues) { const k = i.path[0] as keyof SantaForm; next[k] ??= i.message; }
      setErrors(next);
      document.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return;
    }
    setStage("review"); top();
  };
  const confirm = () => { setForm(emptySantaForm()); setStage("done"); top(); };

  const field = (k: keyof SantaForm, label: string, extra: ReactNode) => (
    <label className={lbl}>
      {label}
      {extra}
      {errors[k] && <span role="alert" className="mt-1 block text-[12px] normal-case tracking-normal text-primary">{errors[k]}</span>}
    </label>
  );
  const text = (k: Exclude<keyof SantaForm, "demo">, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) =>
    field(k, label, <input name={k} value={form[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} autoComplete="off" className={inp} {...props} />);

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-accent-foreground">🤫 Area grandi: meglio non far leggere questa pagina ai bambini.</div>
      </div>

      <section className="mx-auto grid max-w-6xl items-end gap-6 px-4 pt-8 md:grid-cols-[1.1fr_1fr]">
        <div className="pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Sezione speciale · 24 dicembre</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.02] sm:text-7xl">Prenota il tuo<br /><span className="text-gold">Babbo Natale</span></h1>
          <p className="mt-4 max-w-md text-lg text-foreground/85">La sera della Vigilia, qualcuno bussa alla porta. Con la barba bianca, il sacco pieno e i regali che hai preparato tu.</p>
          <span className="mt-5 inline-block rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary">Servizio in definizione · contenuti e disponibilità da confermare</span>
        </div>
        <div className="santa-stage overflow-hidden rounded-[2rem] shadow-deep">
          <SantaScene p={0.26} forceLit className="mx-auto block h-[46svh] max-h-[460px] w-full" />
        </div>
      </section>

      <section className="mx-auto mt-12 grid max-w-6xl gap-3 px-4 sm:grid-cols-3">
        {[
          { i: <Gift className="h-5 w-5" />, t: "I regali li scegli tu", d: "La famiglia prepara e incarta i regali: Babbo Natale li porta, non li compra." },
          { i: <MapPin className="h-5 w-5" />, t: "Consegna in sede prima", d: "I regali si lasciano in sede, indicativamente il sabato prima della Vigilia. Data e luogo da confermare." },
          { i: <ShieldCheck className="h-5 w-5" />, t: "La sera del 24", d: "Volontari CRI nei panni di Babbo Natale e aiutanti. Zone servite e fasce orarie da confermare." },
        ].map((c) => (
          <div key={c.t} className="glass rounded-3xl p-5">
            <span className="inline-flex rounded-full bg-primary p-2.5 text-primary-foreground">{c.i}</span>
            <p className="mt-3 font-display text-xl">{c.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-4">
        <div className="flex flex-col gap-4 rounded-3xl border hairline-gold bg-burgundy p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gold">Contributo proposto · DEMO</p>
            <p className="mt-1 font-display text-4xl">€{SANTA_CONTRIBUTION_EUR} <span className="text-lg">a famiglia</span></p>
            <p className="mt-1 text-sm font-semibold text-gold">{SANTA_CONTRIBUTION_NOTE}</p>
          </div>
          <p className="max-w-sm text-xs text-foreground/75">Nota per il Comitato: proposta basata su servizi analoghi ({SANTA_REFERENCES.map((r) => `${r.who} €${r.eur}`).join(", ")}). Nessun importo viene richiesto in questa demo.</p>
        </div>
      </section>

      <section id="prenota" className="mx-auto mt-12 max-w-2xl scroll-mt-24 px-4">
        <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest">
          {(["form", "review", "done"] as Stage[]).map((s, i) => (
            <span key={s} className={`rounded-full px-3 py-1 ${stage === s ? "bg-gold text-accent-foreground" : "glass text-muted-foreground"}`}>{i + 1}. {s === "form" ? "Dati" : s === "review" ? "Riepilogo" : "Conferma"}</span>
          ))}
        </div>

        {stage === "form" && (
          <form noValidate onSubmit={(e) => { e.preventDefault(); review(); }} className="glass-strong space-y-4 rounded-[2rem] p-5 shadow-deep sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gold">Modulo DEMO per un adulto · nessun dato viene inviato o salvato</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("nome", "Nome", { placeholder: "Giulia" })}
              {text("cognome", "Cognome", { placeholder: "Rossi" })}
              {text("email", "Email", { type: "email", inputMode: "email", placeholder: "nome@esempio.it" })}
              {text("telefono", "Telefono", { type: "tel", inputMode: "tel", placeholder: "333 1234567" })}
            </div>
            {text("indirizzo", "Indirizzo a Monza", { placeholder: "Via…, numero civico" })}
            <div className="grid grid-cols-[7rem_1fr] gap-3">
              {text("bambini", "Bambini", { type: "number", inputMode: "numeric", min: 1, max: 8, placeholder: "2" })}
              {field("fascia", "Fascia preferita", (
                <select name="fascia" value={form.fascia} onChange={(e) => set("fascia", e.target.value)} aria-invalid={!!errors.fascia} className={inp}>
                  <option value="" disabled>Da scegliere</option>
                  {SANTA_SLOTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              ))}
            </div>
            {text("nomiBambini", "Nomi dei bambini (facoltativo)", { placeholder: "Sofia, Leo" })}
            {field("note", "Note per Babbo Natale (facoltative)", (
              <textarea name="note" rows={3} maxLength={300} value={form.note} onChange={(e) => set("note", e.target.value)} aria-invalid={!!errors.note} className={inp} placeholder="Curiosità, un desiderio speciale…" />
            ))}
            <p className="text-[11px] text-muted-foreground">Fasce orarie, zone servite e date di consegna dei regali sono da confermare.</p>
            <label className="flex items-start gap-3 text-sm">
              <input name="demo" type="checkbox" checked={form.demo} onChange={(e) => set("demo", e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
              <span>Ho capito che è una <strong>simulazione</strong>: nessuna prenotazione viene creata e i dati non vengono inviati né salvati.</span>
            </label>
            {errors.demo && <p role="alert" className="text-[12px] text-primary">{errors.demo}</p>}
            <button className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground shadow-deep">Vai al riepilogo</button>
          </form>
        )}

        {stage === "review" && (
          <div className="animate-rise glass-strong rounded-[2rem] p-5 shadow-deep sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gold">Riepilogo DEMO</p>
            <h2 className="mt-2 font-display text-3xl">Famiglia {form.cognome.trim()}</h2>
            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Referente", `${form.nome.trim()} ${form.cognome.trim()}`], ["Email", form.email.trim()], ["Telefono", form.telefono.trim()],
                ["Indirizzo", form.indirizzo.trim()], ["Bambini", `${form.bambini}${form.nomiBambini.trim() ? ` · ${form.nomiBambini.trim()}` : ""}`],
                ["Fascia preferita", `${form.fascia} · da confermare`], ["Note", form.note.trim() || "—"],
                ["Contributo", `€${SANTA_CONTRIBUTION_EUR} · ${SANTA_CONTRIBUTION_NOTE}`],
              ].map(([k, v]) => (
                <div key={k} className="border-b pb-2"><dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{k}</dt><dd className="mt-0.5 break-words">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-6 font-display text-xl">A quale progetto vuoi destinare il tuo contributo?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {PROJECTS.map((p) => (
                <button key={p.id} type="button" aria-pressed={proj === p.id} onClick={() => setProj(p.id)} className={`flex flex-col items-center rounded-2xl border p-3 text-center text-sm transition ${proj === p.id ? "border-gold bg-secondary" : "glass"}`}>
                  <OrnamentIcon kind={p.ornament} className="w-10" />{p.title}
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => { setStage("form"); top(); }} className="glass inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold"><Pencil className="h-4 w-4" /> Modifica</button>
              <button type="button" onClick={confirm} className="flex-[2] rounded-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-deep">Conferma prenotazione simulata</button>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Demo: alla conferma i dati vengono cancellati da questa pagina. Nessun pagamento, nessuna email.</p>
          </div>
        )}

        {stage === "done" && (
          <div className="animate-rise glass-strong rounded-[2rem] p-6 text-center shadow-deep">
            <span className="mx-auto inline-flex rounded-full bg-gold p-3 text-accent-foreground"><Check className="h-6 w-6" /></span>
            <p className="mt-4 font-display text-3xl">Ho, ho, ho! Simulazione completata.</p>
            <p className="mt-2 text-muted-foreground">Demo – nessuna prenotazione è stata inviata né memorizzata. I dati inseriti sono già stati cancellati.</p>
            {proj && <p className="mt-3 text-sm text-gold">Nella versione reale il contributo andrebbe a “{PROJECTS.find((p) => p.id === proj)?.title}”.</p>}
            <div className="mt-6 rounded-2xl border p-4 text-left text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Nella versione reale (da definire con il Comitato):</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>conferma della disponibilità per zona e fascia oraria;</li>
                <li>indicazioni su data e luogo di consegna dei regali in sede;</li>
                <li>contributo definitivo e modalità di pagamento.</li>
              </ul>
            </div>
            <button onClick={() => { setProj(null); setStage("form"); }} className="mt-6 rounded-full border px-6 py-3 text-sm font-semibold">Prova di nuovo</button>
          </div>
        )}
        <p className="mt-6 text-center text-[11px] text-muted-foreground">Questo servizio vive solo in questa sezione: i regali per Monza non danno diritto alla visita di Babbo Natale.</p>
      </section>
    </Shell>
  );
}
