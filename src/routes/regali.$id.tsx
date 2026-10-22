import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Banknote, Check, CreditCard, ExternalLink, CalendarClock, Download, Heart, LocateFixed, Mail, MessageCircle, Send, Sparkles } from "lucide-react";
import { Shell } from "@/components/xmas/Shell";
import { Snow } from "@/components/xmas/Snow";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { Modal, DemoNotice } from "@/components/xmas/Modal";
import { Postcard, EmailPreview } from "@/components/xmas/Postcard";
import { CRI, getProject, type Project } from "@/lib/data";
import { addOrnament, dedicaSchema } from "@/lib/tree-store";
import { QRCodeSVG } from "qrcode.react";
import { amountSchema, cashRequestStatus, createCashRequest, euro, formatCode, type CashStatus, type PaymentChoice } from "@/lib/cash";
import { postcardText, renderPostcardImage } from "@/lib/postcard-share";
import { CHRISTMAS_DELIVERY, confirmationText, deliveryLabel, giftEmailSchema, type EmailMode } from "@/lib/email-demo";

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
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Detail,
});

type Step = "detail" | "checkout" | "cash" | "success" | "dedica" | "sorpresa" | "mine";

function Detail() {
  const { id } = Route.useLoaderData();
  const p = getProject(id)!;
  const [step, setStep] = useState<Step>("detail");
  const [amount, setAmount] = useState(p.amounts[1]?.value ?? 10);
  const go = (s: Step) => { setStep(s); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <button onClick={() => (step === "detail" ? history.back() : go(step === "checkout" ? "detail" : step === "success" || step === "cash" ? "checkout" : "success"))} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Indietro
        </button>
      </div>
      {step === "detail" && <DetailView p={p} amount={amount} setAmount={setAmount} onGo={() => go("checkout")} />}
      {step === "checkout" && <Checkout p={p} amount={amount} setAmount={setAmount} onConfirm={(m) => go(m === "cash" ? "cash" : "success")} />}
      {step === "cash" && <CashFlow p={p} amount={amount} />}
      {step === "success" && <Success p={p} onPick={go} />}
      {step === "mine" && <Mine p={p} />}
      {step === "dedica" && <Dedica p={p} onDetail={() => go("detail")} onEmail={() => go("sorpresa")} />}
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

      <section className="glass-strong mt-10 rounded-3xl p-5 shadow-deep">
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

function Checkout({ p, amount, setAmount, onConfirm }: { p: Project; amount: number; setAmount: (n: number) => void; onConfirm: (m: PaymentChoice) => void }) {
  const [method, setMethod] = useState<PaymentChoice>("sumup");
  const methods: { id: PaymentChoice; label: string; sub: string; icon: React.ReactNode }[] = [
    { id: "sumup", label: "SumUp online", sub: "Carta · simulatore", icon: <CreditCard className="h-5 w-5" /> },
    { id: "paypal", label: "PayPal online", sub: "Simulatore", icon: <span className="font-bold italic">P</span> },
    { id: "cash", label: "Contanti alla casetta", sub: "Piazza San Paolo", icon: <Banknote className="h-5 w-5" /> },
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
      <p className="mt-6 text-sm font-semibold">Come vuoi donare</p>
      <div role="radiogroup" aria-label="Metodo di donazione" className="mt-3 grid gap-2">
        {methods.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)} className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left text-sm transition ${method === m.id ? "border-gold bg-secondary" : "glass"}`}>
            {m.icon}<span><span className="block font-semibold">{m.label}</span><span className="text-xs text-muted-foreground">{m.sub}</span></span>
            {method === m.id && <Check className="ml-auto h-4 w-4 text-gold" />}
          </button>
        ))}
      </div>
      {method !== "cash" ? (
        <div className="mt-4 rounded-2xl border border-dashed hairline-gold p-4 text-sm" data-testid="online-simulator">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gold">Simulatore {method === "sumup" ? "SumUp" : "PayPal"} · DEMO</p>
          <p className="mt-1 text-muted-foreground">Nessun collegamento a {method === "sumup" ? "SumUp" : "PayPal"}: non viene aperto alcun pagamento, nessun dato di carta o conto viene richiesto o verificato.</p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed hairline-gold p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gold">Contanti · DEMO</p>
          <p className="mt-1 text-muted-foreground">Prepari il tuo addobbo e ricevi un QR con l'importo. Alla casetta in Piazza San Paolo un volontario lo scansiona: solo allora la pallina compare sull'albero.</p>
        </div>
      )}
      <button onClick={() => onConfirm(method)} className="mt-8 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground shadow-deep">
        {method === "cash" ? "Continua · prepara il QR" : `Simula pagamento ${method === "sumup" ? "SumUp" : "PayPal"}`}
      </button>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">Demo: nessun pagamento verrà effettuato. Nessun dato di pagamento viene raccolto.</p>
    </section>
  );
}

const CASH_KEY = "cri-cash-pending";
type Pending = { code: string; amount_cents: number; expires_at: string; kind: string };
function CashFlow({ p, amount }: { p: Project; amount: number }) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [status, setStatus] = useState<CashStatus>("pending");
  useEffect(() => {
    try { const s = JSON.parse(sessionStorage.getItem(CASH_KEY) ?? "null") as Pending | null; if (s && s.kind === p.ornament && new Date(s.expires_at) > new Date()) setPending(s); } catch { /* ignore */ }
  }, [p.ornament]);
  useEffect(() => {
    if (!pending || status === "confirmed") return;
    let on = true;
    const check = () => cashRequestStatus(pending.code).then((s) => { if (on) setStatus(s); if (s !== "pending") sessionStorage.removeItem(CASH_KEY); }).catch(() => undefined);
    void check();
    const t = setInterval(check, 5000);
    return () => { on = false; clearInterval(t); };
  }, [pending, status]);
  const submit = async () => {
    const a = amountSchema.safeParse(amount);
    if (!a.success) { setErr(a.error.issues[0]?.message ?? "Importo non valido"); return; }
    const r = dedicaSchema.safeParse({ firma: name, dedica: msg, consent });
    if (!r.success) { setErr(r.error.issues[0]?.message ?? "Dati non validi"); return; }
    setErr(""); setBusy(true);
    try {
      const row = await createCashRequest(p.ornament, a.data, r.data.firma, r.data.dedica, r.data.consent);
      const next = { code: row.code, amount_cents: row.amount_cents, expires_at: row.expires_at, kind: p.ornament };
      sessionStorage.setItem(CASH_KEY, JSON.stringify(next));
      setStatus("pending"); setPending(next); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setErr(e instanceof Error ? e.message : "Errore, riprova"); }
    finally { setBusy(false); }
  };

  if (pending) return (
    <section className="animate-rise mx-auto max-w-lg px-4 pt-6 text-center">
      <span className="rounded-full border hairline-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold">Contanti alla casetta · DEMO</span>
      {status === "confirmed" ? (
        <>
          <OrnamentIcon kind={p.ornament} className="animate-arrive mx-auto mt-8 w-24" />
          <h1 className="mt-6 font-display text-4xl leading-tight">Grazie! <span className="text-gold">La tua pallina è sull'albero.</span></h1>
          <p className="mt-3 text-sm text-muted-foreground">Un volontario ha confermato il regalo (passaggio simulato, nessun incasso reale).</p>
          <Link to="/albero" search={{ trova: 1 }} className="mt-6 flex items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-primary-foreground"><LocateFixed className="h-4 w-4" /> Trova il mio addobbo</Link>
        </>
      ) : status === "expired" || status === "not_found" ? (
        <>
          <h1 className="mt-6 font-display text-3xl">QR scaduto</h1>
          <p className="mt-2 text-sm text-muted-foreground">Nessuna pallina è stata appesa. Puoi prepararne uno nuovo.</p>
          <button onClick={() => { setPending(null); setStatus("pending"); }} className="mt-6 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">Prepara un nuovo QR</button>
        </>
      ) : (
        <>
          <h1 className="mt-5 font-display text-3xl leading-tight">Rivolgiti ai volontari <span className="text-gold">della casetta</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">Mostra questo QR in Piazza San Paolo. La pallina comparirà sull'albero solo dopo la conferma del volontario.</p>
          <div className="mx-auto mt-6 w-full max-w-xs rounded-3xl bg-paper p-5 text-ink shadow-deep">
            <QRCodeSVG value={pending.code} className="h-auto w-full" bgColor="transparent" fgColor="currentColor" level="M" aria-label="QR monouso per la casetta" />
            <p className="mt-4 text-xs uppercase tracking-widest">Importo da versare · demo</p>
            <p className="font-display text-5xl" data-testid="cash-amount">{euro(pending.amount_cents)}</p>
            <p className="mt-2 font-mono text-sm tracking-wider" data-testid="cash-code">{formatCode(pending.code)}</p>
            <p className="mt-1 text-[11px]">{p.title} · valido fino alle {new Date(pending.expires_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <p role="status" className="mt-4 text-xs text-gold">In attesa del volontario… questa pagina si aggiorna da sola.</p>
          <p className="mt-2 text-[11px] text-muted-foreground">Il QR contiene solo un codice monouso, nessun dato personale. Demo: nessun pagamento reale.</p>
        </>
      )}
    </section>
  );

  return (
    <section className="mx-auto max-w-lg px-4 pt-6">
      <span className="rounded-full border hairline-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold">Contanti alla casetta · DEMO</span>
      <h1 className="mt-4 font-display text-4xl">Prepara il tuo addobbo</h1>
      <p className="mt-2 text-muted-foreground">{p.title} · <span className="text-gold">€{amount}</span>. Nome e dedica sono facoltativi.</p>
      <Field label="Firma (facoltativa)" maxLength={40} placeholder="Es. Giulia" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={90} rows={3} placeholder="Dedica facoltativa · max 90 caratteri" className="glass mt-4 w-full rounded-2xl p-4 outline-none focus:border-gold" />
      <p className="text-right text-[11px] text-muted-foreground">{msg.length}/90</p>
      <label className="mt-3 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
        <span>Acconsento a pubblicare firma e dedica sull'albero e sullo schermo in piazza, dopo la verifica di un moderatore. <span className="text-muted-foreground">Senza consenso, nome e dedica non vengono salvati.</span></span>
      </label>
      {err && <p role="alert" className="mt-2 text-sm text-primary">{err}</p>}
      <button disabled={busy} onClick={submit} className="mt-4 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Preparo il QR…" : "Genera il QR per la casetta"}</button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Fino alla conferma del volontario nessuna pallina viene appesa e il contatore non cambia.</p>
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
      <p className="mt-3 text-sm text-muted-foreground">Simulazione DEMO: nessun importo addebitato, nessuna donazione reale registrata. Scegli come appendere {p.ornamentName}.</p>
      <div className="mt-8 space-y-3 text-left">
        {[
          { s: "mine" as Step, t: "È il mio regalo a Monza", d: "Appendilo all'albero, anche in forma anonima", i: <Heart className="h-5 w-5" /> },
          { s: "dedica" as Step, t: "Dedicalo a una persona", d: "Una cartolina natalizia da condividere su WhatsApp", i: <Send className="h-5 w-5" /> },
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
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ status: string; dedica: string } | null>(null);
  const submit = async () => {
    const r = dedicaSchema.safeParse({ firma: name, dedica: msg, consent });
    if (!r.success) { setErr(r.error.issues[0]?.message ?? "Dati non validi"); return; }
    setErr(""); setBusy(true);
    try {
      const res = await addOrnament(p.ornament, r.data.firma, r.data.dedica, r.data.consent);
      setDone({ status: res?.status ?? "pending", dedica: r.data.consent ? r.data.dedica : "" });
    } catch (e) { setErr(e instanceof Error ? e.message : "Errore, riprova"); }
    finally { setBusy(false); }
  };
  return (
    <section className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="font-display text-4xl">Il tuo addobbo</h1>
      <p className="mt-2 text-muted-foreground">Nome e dedica sono facoltativi: puoi restare anonimo.</p>
      <Field label="Firma (facoltativa)" maxLength={40} placeholder="Es. Giulia" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={90} rows={3} placeholder="Dedica facoltativa · max 90 caratteri" className="glass mt-4 w-full rounded-2xl p-4 outline-none focus:border-gold" />
      <p className="text-right text-[11px] text-muted-foreground">{msg.length}/90</p>
      {err && <p className="mt-1 text-sm text-primary">{err}</p>}
      <label className="mt-3 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
        <span>Acconsento a pubblicare firma e dedica sull'albero e sullo schermo in piazza, dopo la verifica di un moderatore. <span className="text-muted-foreground">Senza consenso, nome e dedica non vengono salvati.</span></span>
      </label>
      <button disabled={busy} onClick={submit} className="mt-4 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">Appendi all'Albero</button>
      <Modal open={!!done} onClose={() => setDone(null)}>
        <DemoNotice>Addobbo appeso all'albero demo condiviso. Donazione simulata: nessun importo reale.</DemoNotice>
        <OrnamentIcon kind={p.ornament} className="animate-floaty mx-auto mt-4 w-20" />
        {done?.dedica && <p className="mt-3 text-center font-display italic">“{done.dedica}”</p>}
        <p className="mt-2 text-center text-xs text-gold">
          {done?.status === "approved" ? "Visibile subito sull'albero" : done?.status === "pending" ? "Dedica in moderazione: l'addobbo è visibile, il testo dopo l'approvazione" : "Dedica non pubblicabile: l'addobbo resta senza testo"}
        </p>
        <Link to="/albero" search={{ trova: 1 }} className="mt-6 flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-center font-semibold text-primary-foreground"><LocateFixed className="h-4 w-4" /> Trova il mio addobbo</Link>
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

const postcardSchema = z.object({
  to: z.string().trim().min(1, "Scrivi il nome di chi riceve la cartolina").max(40, "Massimo 40 caratteri"),
  from: dedicaSchema.shape.firma,
  msg: z.string().trim().max(90, "Massimo 90 caratteri"),
});

function Dedica({ p, onDetail, onEmail }: { p: Project; onDetail: () => void; onEmail: () => void }) {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [msg, setMsg] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ status: string } | null>(null);
  const [hangErr, setHangErr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [shareNote, setShareNote] = useState("");

  useEffect(() => {
    if (!created) return;
    let on = true;
    renderPostcardImage(p, to, from, msg).then((f) => on && setFile(f)).catch(() => on && setFile(null));
    return () => { on = false; };
  }, [created, p, to, from, msg]);

  const create = async () => {
    const r = postcardSchema.safeParse({ to, from, msg });
    if (!r.success) { setErr(r.error.issues[0]?.message ?? "Dati non validi"); return; }
    setErr(""); setBusy(true); setHangErr("");
    try {
      // The recipient name never leaves the device; firma/dedica are stored only with explicit consent.
      const res = await addOrnament(p.ornament, consent ? r.data.from : "", consent ? r.data.msg : "", consent);
      setCreated({ status: res?.status ?? "approved" });
    } catch (e) {
      setHangErr(e instanceof Error ? e.message : "Addobbo non appeso");
      setCreated({ status: "none" });
    } finally { setBusy(false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const share = async () => {
    const text = postcardText(p, to, from, msg);
    if (file && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Cartolina CRI Monza · demo", text }); setShareNote("Scegli WhatsApp dal menu di condivisione."); return; }
      catch (e) { if (e instanceof Error && e.name === "AbortError") return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setShareNote("Si apre WhatsApp con il messaggio e il link al progetto. Puoi allegare l'immagine scaricata.");
  };
  const download = () => {
    if (!file) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (created) return (
    <section className="animate-rise mx-auto max-w-lg px-4 pt-6">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gold">La tua cartolina · demo</p>
      <h1 className="mt-2 font-display text-4xl leading-tight">Per {to.trim()}, <span className="text-gold">con amore da Monza.</span></h1>
      <div className="mt-6"><Postcard project={p} to={to.trim()} from={from.trim()} msg={msg.trim()} /></div>
      <p className="mt-3 text-center text-xs text-gold">
        {hangErr ? `Addobbo non appeso: ${hangErr}` : created.status === "pending" ? "Il tuo addobbo è sull'albero; la dedica pubblica sarà visibile dopo la moderazione." : created.status === "rejected" ? "Il tuo addobbo è sull'albero, senza testo pubblico." : "Il tuo addobbo è già appeso all'Albero di Monza."}
      </p>
      <div className="mt-6 space-y-2">
        <button onClick={share} className="flex w-full items-center justify-center gap-2 rounded-full bg-fir py-4 font-semibold text-snow shadow-deep"><MessageCircle className="h-5 w-5" /> Condividi su WhatsApp</button>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={download} disabled={!file} className="glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-50"><Download className="h-4 w-4" /> Scarica immagine</button>
          <Link to="/albero" search={{ trova: 1 }} className="glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"><LocateFixed className="h-4 w-4" /> Trova il mio addobbo</Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onDetail} className="glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"><Sparkles className="h-4 w-4" /> Il progetto</button>
          <button onClick={onEmail} className="glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"><Mail className="h-4 w-4" /> Anteprima email</button>
        </div>
      </div>
      {shareNote && <p role="status" className="mt-3 text-center text-xs text-muted-foreground">{shareNote}</p>}
      <p className="mt-4 text-center text-[11px] text-muted-foreground">La condivisione apre davvero WhatsApp o il menu del telefono; il messaggio indica che si tratta di una cartolina DEMO. Il nome del destinatario non viene salvato.</p>
    </section>
  );

  return (
    <section className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="font-display text-4xl">Dedicalo a una persona</h1>
      <p className="mt-2 text-muted-foreground">Crea la cartolina di “{p.title}” e appendi il tuo addobbo all'Albero di Monza.</p>
      <div className="mt-6 space-y-4">
        <Field label="Per" placeholder="Nome del destinatario" maxLength={40} value={to} onChange={(e) => setTo(e.target.value)} />
        <Field label="Da (facoltativo)" placeholder="Il tuo nome" maxLength={40} value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dedica</span>
          <textarea rows={3} maxLength={90} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={p.postcardLine} className="glass mt-1.5 w-full rounded-2xl p-4 outline-none focus:border-gold" />
        </label>
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setMsg(p.postcardLine)} className="rounded-full border hairline-gold px-3 py-1.5 text-xs text-gold">Usa la frase suggerita</button>
          <span className="text-[11px] text-muted-foreground">{msg.length}/90</span>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
          <span>Pubblica anche “Da” e dedica sull'albero e sullo schermo in piazza, dopo la verifica di un moderatore. <span className="text-muted-foreground">Facoltativo: senza consenso l'addobbo resta anonimo.</span></span>
        </label>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-primary">{err}</p>}
      <button disabled={busy} onClick={create} className="mt-6 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Preparo la cartolina…" : "Crea la cartolina"}</button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Demo: nessuna donazione reale. Il nome del destinatario resta solo su questo dispositivo.</p>
    </section>
  );
}

function Sorpresa({ p }: { p: Project }) {
  const [mode, setMode] = useState<EmailMode>("christmas");
  const [donor, setDonor] = useState("");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<EmailMode | null>(null);
  const confirm = () => {
    const r = giftEmailSchema.safeParse({ mode, donor, to, msg });
    if (!r.success) { setError(r.error.issues[0]?.message ?? "Dati non validi"); return; }
    setError("");
    setDone(r.data.mode);
    // Nothing is kept: the recipient address is cleared right after the simulated confirmation.
    setTo(""); setMsg("");
  };
  const modes: { id: EmailMode; t: string; d: string; i: React.ReactNode }[] = [
    { id: "now", t: "Invia ora", d: "Arriva subito al destinatario", i: <Send className="h-5 w-5" /> },
    { id: "christmas", t: "Sorprendilo a Natale", d: CHRISTMAS_DELIVERY, i: <CalendarClock className="h-5 w-5" /> },
  ];
  return (
    <section className="mx-auto max-w-5xl px-4 pt-6">
      <h1 className="font-display text-4xl">Regalalo via email</h1>
      <p className="mt-2 text-muted-foreground">Scegli se farlo arrivare subito o proprio la notte di Natale.</p>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <div role="radiogroup" aria-label="Quando inviare l'email" className="grid grid-cols-2 gap-3">
            {modes.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${mode === m.id ? "border-gold bg-secondary" : "glass"}`}>
                <span className={mode === m.id ? "text-gold" : "text-muted-foreground"}>{m.i}</span>
                <span className="font-display text-lg leading-tight">{m.t}</span>
                <span className="text-xs text-muted-foreground">{m.d}</span>
              </button>
            ))}
          </div>
          <Field label="Il tuo nome (facoltativo)" placeholder="Federico" maxLength={40} value={donor} onChange={(e) => setDonor(e.target.value)} />
          <Field label="Email destinatario" type="email" autoComplete="off" placeholder="nome@esempio.it" maxLength={255} value={to} onChange={(e) => setTo(e.target.value)} />
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dedica (facoltativa)</span>
            <textarea rows={3} maxLength={90} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Buon Natale! Quest'anno ho pensato a un regalo diverso." className="glass mt-1.5 w-full rounded-2xl p-4 outline-none focus:border-gold" />
          </label>
          <div className="glass flex items-center gap-3 rounded-2xl p-4">
            <CalendarClock className="h-6 w-6 text-gold" />
            <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Consegna · demo</p><p className="font-display text-lg">{deliveryLabel(mode)}</p></div>
          </div>
          {error && <p role="alert" className="text-sm text-gold">{error}</p>}
          <button onClick={confirm} className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">{mode === "now" ? "Invia ora" : "Programma sorpresa"}</button>
          <p className="text-center text-[11px] text-muted-foreground">Demo: nessuna email verrà inviata o programmata, nessun indirizzo viene salvato.</p>
        </div>
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gold">Anteprima email</p>
          <EmailPreview project={p} donor={donor} to={to} msg={msg} mode={mode} />
        </div>
      </div>
      <Modal open={done !== null} onClose={() => setDone(null)}>
        <DemoNotice>{done ? confirmationText(done) : ""} 🎄</DemoNotice>
        <p className="mt-3 text-center text-sm text-muted-foreground">Questa è una simulazione: nessuna email è stata inviata né programmata, e l'indirizzo non è stato salvato.</p>
      </Modal>
    </section>
  );
}
