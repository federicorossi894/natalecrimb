import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, CreditCard, ExternalLink, CalendarClock, Heart, Mail, Send } from "lucide-react";
import { Shell } from "@/components/xmas/Shell";
import { Snow } from "@/components/xmas/Snow";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { Modal, DemoNotice } from "@/components/xmas/Modal";
import { Postcard, EmailPreview } from "@/components/xmas/Postcard";
import { CRI, getProject, type Project } from "@/lib/data";

export const Route = createFileRoute("/regali/$id")({
  loader: ({ params }) => {
    const p = getProject(params.id);
    if (!p) throw notFound();
    return { id: p.id };
  },
  head: ({ loaderData }) => {
    const p = loaderData ? getProject(loaderData.id) : undefined;
    const t = p ? `${p.title} – Il Natale che fa bene · CRI Monza` : "Regalo non trovato";
    return {
      meta: [
        { title: t },
        { name: "description", content: p?.tagline ?? "" },
        { property: "og:title", content: t },
        { property: "og:description", content: p?.tagline ?? "" },
      ],
    };
  },
  component: Detail,
});

type Step = "detail" | "checkout" | "success" | "dedica" | "sorpresa" | "mine";

function Detail() {
  const { id } = Route.useLoaderData();
  const p = getProject(id)!;
  const [step, setStep] = useState<Step>("detail");
  const [amount, setAmount] = useState(p.amounts[1].value);
  const go = (s: Step) => { setStep(s); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <button onClick={() => (step === "detail" ? history.back() : go(step === "checkout" ? "detail" : step === "success" ? "checkout" : "success"))} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Indietro
        </button>
      </div>
      {step === "detail" && <DetailView p={p} amount={amount} setAmount={setAmount} onGo={() => go("checkout")} />}
      {step === "checkout" && <Checkout p={p} amount={amount} setAmount={setAmount} onConfirm={() => go("success")} />}
      {step === "success" && <Success p={p} onPick={go} />}
      {step === "mine" && <Mine p={p} />}
      {step === "dedica" && <Dedica p={p} />}
      {step === "sorpresa" && <Sorpresa p={p} />}
    </Shell>
  );
}

function Amounts({ p, amount, setAmount }: { p: Project; amount: number; setAmount: (n: number) => void }) {
  const [custom, setCustom] = useState("");
  const sel = p.amounts.find((a) => a.value === amount);
  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {p.amounts.map((a) => (
          <button key={a.value} onClick={() => { setAmount(a.value); setCustom(""); }} className={`rounded-2xl border py-3 font-display text-lg transition ${amount === a.value && !custom ? "border-gold bg-gold text-accent-foreground" : "glass"}`}>
            €{a.value}
          </button>
        ))}
        <input inputMode="numeric" placeholder="Altro" value={custom} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setCustom(v); if (v) setAmount(Number(v)); }} className={`w-full rounded-2xl border bg-transparent text-center text-sm outline-none ${custom ? "border-gold" : "glass"}`} />
      </div>
      <p className="mt-3 min-h-5 text-sm text-gold">{sel && !custom ? `→ ${sel.impact}` : custom ? `→ €${custom}: grazie, ogni euro conta` : ""}</p>
      <p className="text-[11px] text-muted-foreground">Esempi di impatto indicativi · demo</p>
    </div>
  );
}

function DetailView({ p, amount, setAmount, onGo }: { p: Project; amount: number; setAmount: (n: number) => void; onGo: () => void }) {
  return (
    <article className="mx-auto max-w-3xl px-4">
      <header className="relative mt-4 overflow-hidden rounded-[2rem] bg-fir-deep p-6 sm:p-10">
        <Snow count={25} />
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
        <OrnamentIcon kind={p.ornament} className="animate-floaty relative w-24 sm:w-28" />
        <p className="relative mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-gold">{p.kicker}</p>
        <h1 className="relative mt-2 font-display text-5xl leading-none sm:text-6xl">{p.title}</h1>
        <p className="relative mt-4 font-display text-xl italic text-foreground/85">{p.tagline}</p>
      </header>

      <p className="mt-8 text-lg leading-relaxed text-foreground/90">{p.story}</p>

      {p.id === "battito" && (
        <div className="glass mt-8 rounded-3xl p-5">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-xl">Verso un nuovo DAE per Monza</p>
            <span className="text-[10px] uppercase tracking-widest text-gold">Demo</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary">
            <div className="shimmer-gold h-full rounded-full" style={{ width: "64%" }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">€1.920 di €3.000 · 64% · valori di esempio</p>
        </div>
      )}

      <section className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Guarda cosa facciamo</p>
        <ul className="mt-4 space-y-2">
          {p.doing.map((d, i) => (
            <li key={d} className="glass flex items-center gap-4 rounded-2xl px-4 py-3.5">
              <span className="font-display text-2xl text-gold">{String(i + 1).padStart(2, "0")}</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </section>

      {p.id === "battito" && (
        <section className="mt-10 rounded-3xl border-2 border-primary/60 p-6">
          <Heart className="h-7 w-7 text-primary" />
          <h3 className="mt-3 font-display text-2xl">Un DAE senza persone che sappiano usarlo non basta.</h3>
          <p className="mt-2 text-muted-foreground">Impara anche tu: bastano poche ore per diventare la persona che fa la differenza.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {[[CRI.blsd, "Corso BLSD"], [CRI.primoSoccorso, "Corso di primo soccorso"], [CRI.corsi, "Tutti i corsi CRI Monza"]].map(([h, l]) => (
              <a key={h} href={h} target="_blank" rel="noreferrer" className="glass inline-flex items-center justify-between gap-2 rounded-full px-5 py-3 text-sm font-semibold hover:text-gold">
                {l} <ExternalLink className="h-4 w-4" />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="glass-strong sticky bottom-20 mt-10 rounded-3xl p-5 shadow-deep">
        <p className="mb-3 font-display text-xl">Scegli il tuo regalo</p>
        <Amounts p={p} amount={amount} setAmount={setAmount} />
        <button onClick={onGo} className="mt-4 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground transition hover:scale-[1.01]">
          Fai questo regalo · €{amount}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">Demo: nessun pagamento verrà effettuato</p>
      </section>
    </article>
  );
}

function Checkout({ p, amount, setAmount, onConfirm }: { p: Project; amount: number; setAmount: (n: number) => void; onConfirm: () => void }) {
  const [method, setMethod] = useState("card");
  const methods = [
    { id: "card", label: "Carta", icon: <CreditCard className="h-5 w-5" /> },
    { id: "paypal", label: "PayPal", icon: <span className="font-bold italic">P</span> },
    { id: "apple", label: "Apple Pay", icon: <span className="font-semibold"></span> },
    { id: "google", label: "Google Pay", icon: <span className="font-bold">G</span> },
  ];
  return (
    <section className="animate-rise mx-auto max-w-lg px-4 pt-6">
      <span className="rounded-full border hairline-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold">Checkout demo</span>
      <h1 className="mt-4 font-display text-4xl">Il tuo regalo</h1>
      <div className="glass mt-6 flex items-center gap-4 rounded-3xl p-4">
        <OrnamentIcon kind={p.ornament} className="w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl">{p.title}</p>
          <p className="truncate text-sm text-muted-foreground">Diventerà {p.ornamentName} sull'Albero di Monza</p>
        </div>
        <p className="font-display text-2xl text-gold">€{amount}</p>
      </div>
      <div className="mt-6"><Amounts p={p} amount={amount} setAmount={setAmount} /></div>
      <p className="mt-6 text-sm font-semibold">Metodo di pagamento</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {methods.map((m) => (
          <button key={m.id} onClick={() => setMethod(m.id)} className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-sm transition ${method === m.id ? "border-gold bg-secondary" : "glass"}`}>
            {m.icon} {m.label}
            {method === m.id && <Check className="ml-auto h-4 w-4 text-gold" />}
          </button>
        ))}
      </div>
      {method === "card" && (
        <div className="mt-4 space-y-2 opacity-70">
          <div className="glass rounded-xl px-4 py-3 text-sm text-muted-foreground">•••• •••• •••• 4242 <span className="float-right text-[10px]">DEMO</span></div>
          <div className="grid grid-cols-2 gap-2"><div className="glass rounded-xl px-4 py-3 text-sm text-muted-foreground">12/28</div><div className="glass rounded-xl px-4 py-3 text-sm text-muted-foreground">•••</div></div>
        </div>
      )}
      <button onClick={onConfirm} className="mt-8 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground shadow-deep">Conferma regalo</button>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">Demo: nessun pagamento verrà effettuato. Nessun dato viene raccolto.</p>
    </section>
  );
}

function Success({ p, onPick }: { p: Project; onPick: (s: Step) => void }) {
  return (
    <section className="relative mx-auto max-w-lg px-4 pt-10 text-center">
      <Snow count={40} />
      <div className="relative mx-auto w-28">
        <div className="absolute inset-0 rounded-full bg-gold/40 blur-2xl" />
        <OrnamentIcon kind={p.ornament} className="animate-arrive relative left-1/2 top-1/2 w-28" />
      </div>
      <h1 className="animate-rise mt-8 font-display text-4xl leading-tight">🎁 Il tuo regalo è arrivato.<br /><span className="text-gold">Ora puoi regalarlo a qualcuno.</span></h1>
      <p className="mt-3 text-sm text-muted-foreground">{p.ornamentName[0].toUpperCase() + p.ornamentName.slice(1)} è stato appeso all'Albero di Monza (demo).</p>
      <div className="mt-8 space-y-3 text-left">
        {[
          { s: "mine" as Step, t: "È il mio regalo a Monza", d: "Appendilo all'albero, anche in forma anonima", i: <Heart className="h-5 w-5" /> },
          { s: "dedica" as Step, t: "Dedicalo a qualcuno", d: "Crea una cartolina natalizia da condividere", i: <Send className="h-5 w-5" /> },
          { s: "sorpresa" as Step, t: "Fagli una sorpresa a Natale", d: "Un'email che arriva la notte di Natale", i: <Mail className="h-5 w-5" /> },
        ].map((o) => (
          <button key={o.s} onClick={() => onPick(o.s)} className="glass flex w-full items-center gap-4 rounded-2xl p-4 transition hover:border-gold">
            <span className="rounded-full bg-primary p-3 text-primary-foreground">{o.i}</span>
            <span><span className="block font-display text-lg">{o.t}</span><span className="text-sm text-muted-foreground">{o.d}</span></span>
          </button>
        ))}
      </div>
      <p className="mt-6 text-[11px] text-muted-foreground">Demo · nessuna operazione reale è stata eseguita</p>
    </section>
  );
}

function Mine({ p }: { p: Project }) {
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="font-display text-4xl">Il tuo addobbo</h1>
      <p className="mt-2 text-muted-foreground">Lascia una dedica sul retro, oppure resta anonimo.</p>
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={90} rows={3} placeholder="Perché nessuno dovrebbe sentirsi solo a Natale." className="glass mt-5 w-full rounded-2xl p-4 outline-none focus:border-gold" />
      <button onClick={() => setDone(true)} className="mt-4 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">Appendi all'Albero</button>
      <Modal open={done} onClose={() => setDone(false)}>
        <DemoNotice>Il tuo addobbo è appeso all'Albero di Monza.</DemoNotice>
        <OrnamentIcon kind={p.ornament} className="animate-floaty mx-auto mt-4 w-20" />
        <p className="mt-3 text-center font-display italic">“{msg || "Un regalo anonimo per Monza ❤️"}”</p>
        <Link to="/albero" className="mt-6 block rounded-full bg-primary py-3 text-center font-semibold text-primary-foreground">Guarda l'Albero</Link>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">Nella versione reale comparirà sull'albero e sullo schermo in piazza.</p>
      </Modal>
    </section>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <input {...rest} className="glass mt-1.5 w-full rounded-2xl px-4 py-3.5 outline-none focus:border-gold" />
    </label>
  );
}

function Dedica({ p }: { p: Project }) {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(false);
  const [wa, setWa] = useState(false);
  return (
    <section className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="font-display text-4xl">Dedicalo a qualcuno</h1>
      <p className="mt-2 text-muted-foreground">Riceverà una cartolina natalizia di Croce Rossa Monza.</p>
      <div className="mt-6 space-y-4">
        <Field label="Per" placeholder="Nome del destinatario" value={to} onChange={(e) => setTo(e.target.value)} />
        <Field label="Da" placeholder="Il tuo nome" value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dedica</span>
          <textarea rows={3} maxLength={140} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Quest'anno il mio regalo per te è per tutta Monza." className="glass mt-1.5 w-full rounded-2xl p-4 outline-none focus:border-gold" />
        </label>
      </div>
      <button onClick={() => setPreview(true)} className="mt-6 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">Crea la cartolina</button>
      <Modal open={preview} onClose={() => setPreview(false)} wide>
        <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-widest text-gold">Anteprima cartolina · demo</p>
        <Postcard project={p} to={to} from={from} msg={msg} />
        <button onClick={() => setWa(true)} className="mt-5 w-full rounded-full bg-fir py-3.5 font-semibold text-snow">Condividi su WhatsApp</button>
      </Modal>
      <Modal open={wa} onClose={() => setWa(false)}>
        <DemoNotice>Nella versione reale si aprirà la condivisione WhatsApp.</DemoNotice>
      </Modal>
    </section>
  );
}

function Sorpresa({ p }: { p: Project }) {
  const [donor, setDonor] = useState("");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  return (
    <section className="mx-auto max-w-5xl px-4 pt-6">
      <h1 className="font-display text-4xl">Fagli una sorpresa a Natale</h1>
      <p className="mt-2 text-muted-foreground">Un'email che arriva proprio la notte di Natale.</p>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <Field label="Il tuo nome" placeholder="Federico" value={donor} onChange={(e) => setDonor(e.target.value)} />
          <Field label="Email destinatario" type="email" placeholder="nome@esempio.it" value={to} onChange={(e) => setTo(e.target.value)} />
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dedica</span>
            <textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Buon Natale! Quest'anno ho pensato a un regalo diverso." className="glass mt-1.5 w-full rounded-2xl p-4 outline-none focus:border-gold" />
          </label>
          <div className="glass flex items-center gap-3 rounded-2xl p-4">
            <CalendarClock className="h-6 w-6 text-gold" />
            <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Consegna programmata</p><p className="font-display text-lg">24 dicembre · ore 00:05</p></div>
          </div>
          <button onClick={() => setOk(true)} className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">Programma sorpresa</button>
          <p className="text-center text-[11px] text-muted-foreground">Demo: nessuna email verrà inviata.</p>
        </div>
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gold">Anteprima email</p>
          <EmailPreview project={p} donor={donor} to={to} msg={msg} />
        </div>
      </div>
      <Modal open={ok} onClose={() => setOk(false)}>
        <DemoNotice>Sorpresa programmata per il 24 dicembre alle 00:05. 🎄</DemoNotice>
        <p className="mt-3 text-center text-sm text-muted-foreground">Questa è una simulazione: nessuna email è stata programmata né inviata.</p>
      </Modal>
    </section>
  );
}
