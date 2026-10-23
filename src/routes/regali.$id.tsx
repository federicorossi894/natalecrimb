import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { ArrowLeft, Banknote, Check, ChevronDown, CreditCard, ExternalLink, Gift, Heart, LocateFixed, Mail, MessageCircle, RotateCcw } from "lucide-react";
import { Shell } from "@/components/xmas/Shell";
import { Snow } from "@/components/xmas/Snow";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { GiftBox } from "@/components/xmas/GiftBox";
import { CityThanks, EmailStudio, PostcardStudio } from "@/components/xmas/PostDonation";
import { CRI, getProject, type Project } from "@/lib/data";
import { addOrnament, dedicaSchema } from "@/lib/tree-store";
import { QRCodeSVG } from "qrcode.react";
import { MAX_GIFT_EURO, MIN_GIFT_EURO, amountSchema, cashRequestResult, clearCashGift, createCashRequest, euro, formatCode, loadCashGift, saveCashGift, type CashStatus, type PaymentChoice, type StoredCashGift } from "@/lib/cash";

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
        { name: "description", content: p?.intro ?? "" },
        { property: "og:title", content: t },
        { property: "og:description", content: p?.opening ?? "" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Detail,
});

type Step = "detail" | "checkout" | "cash" | "success" | "dedica" | "sorpresa" | "mine";
/** The ornament hung for this gift (online: on the first post-donation choice; cash: by the volunteer). */
type Hung = { id: string | null; status: string; via: "online" | "cash"; error?: string };

function Detail() {
  const { id } = Route.useLoaderData();
  const p = getProject(id)!;
  const [step, setStep] = useState<Step>("detail");
  const [preset, setPreset] = useState(5);
  const [custom, setCustom] = useState("");
  const [hung, setHung] = useState<Hung | null>(null);
  // A typed amount is used only when it passes the shared rule (whole euros, 5–1000); otherwise checkout stays closed.
  const parsed = custom ? amountSchema.safeParse(custom) : amountSchema.safeParse(preset);
  const amount = parsed.success ? parsed.data : 0;
  const amountError = parsed.success ? "" : parsed.error.issues[0]?.message ?? "Importo non valido";
  const go = (s: Step) => { setStep(s); window.scrollTo({ top: 0, behavior: "smooth" }); };
  // A cash gift prepared on this phone for this project: resume it (QR or post-confirmation choices).
  useEffect(() => { const g = loadCashGift(); if (g && g.project === p.id) setStep("cash"); }, [p.id]);
  const hang = async (firma: string, dedica: string, consent: boolean): Promise<Hung> => {
    if (hung) return hung;
    try {
      const res = await addOrnament(p.ornament, amount, firma, dedica, consent);
      const h: Hung = { id: res?.id ?? null, status: res?.status ?? "pending", via: "online" };
      setHung(h); return h;
    } catch (e) {
      const h: Hung = { id: null, status: "none", via: "online", error: e instanceof Error ? e.message : "Addobbo non appeso" };
      setHung(h); return h;
    }
  };
  const back = () => {
    if (step === "detail") return history.back();
    if (step === "checkout") return go("detail");
    if (step === "success" || step === "cash") return go(hung?.via === "cash" ? "cash" : "checkout");
    go(hung?.via === "cash" ? "cash" : "success");
  };
  const toCheckout = () => { if (parsed.success) go("checkout"); };

  return (
    <Shell hidePiazzaPill={step !== "detail"}>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <button onClick={back} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Indietro
        </button>
      </div>
      {step === "detail" && <DetailView p={p} preset={preset} setPreset={(v) => { setPreset(v); setCustom(""); }} custom={custom} setCustom={setCustom} amount={amount} error={amountError} onGo={toCheckout} />}
      {step === "checkout" && (parsed.success
        ? <Checkout p={p} amount={amount} onEdit={() => go("detail")} onConfirm={(m) => go(m === "cash" ? "cash" : "success")} />
        : <InvalidAmount error={amountError} onEdit={() => go("detail")} />)}
      {step === "cash" && <CashFlow p={p} amount={amount} onConfirmed={(oid) => setHung({ id: oid, status: "approved", via: "cash" })} onPick={go} />}
      {step === "success" && <Success p={p} onPick={go} />}
      {step === "mine" && <Mine p={p} hung={hung} hang={hang} />}
      {step === "dedica" && <Dedica p={p} hung={hung} hang={hang} onEmail={() => go("sorpresa")} />}
      {step === "sorpresa" && <Sorpresa p={p} hung={hung} hang={hang} />}
    </Shell>
  );
}

function InvalidAmount({ error, onEdit }: { error: string; onEdit: () => void }) {
  return (
    <section className="mx-auto max-w-lg px-4 pt-6 text-center">
      <p role="alert" className="font-display text-2xl">{error}</p>
      <button onClick={onEdit} className="mt-4 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Cambia importo</button>
    </section>
  );
}

function Amounts({ p, preset, setPreset, custom, setCustom, error }: { p: Project; preset: number; setPreset: (n: number) => void; custom: string; setCustom: (s: string) => void; error: string }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Importo della donazione">
        {p.amounts.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={preset === v && !custom} onClick={() => setPreset(v)} className={`rounded-2xl border py-3.5 font-display text-xl transition ${preset === v && !custom ? "border-gold bg-gold text-accent-foreground shadow-deep" : "glass"}`}>
            {v} €
          </button>
        ))}
        <input inputMode="numeric" aria-label={`Altro importo in euro, minimo ${MIN_GIFT_EURO} €`} aria-invalid={Boolean(custom && error)} aria-describedby="amount-help" placeholder="Altro" maxLength={7} value={custom} onChange={(e) => setCustom(e.target.value)} className={`w-full rounded-2xl border bg-transparent text-center text-sm outline-none ${custom && error ? "border-primary" : custom ? "border-gold" : "glass"}`} data-testid="custom-amount" />
      </div>
      {custom && error
        ? <p id="amount-help" role="alert" className="mt-2 text-sm font-semibold text-primary" data-testid="amount-error">{error}</p>
        : <p id="amount-help" className="mt-2 text-xs text-muted-foreground">Altro importo: euro interi, da {MIN_GIFT_EURO} a {MAX_GIFT_EURO} €.</p>}
    </div>
  );
}

function More({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="glass group rounded-2xl px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-lg">
        {title}<ChevronDown className="h-5 w-5 shrink-0 text-gold transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 text-sm leading-relaxed text-foreground/85">{children}</div>
    </details>
  );
}

function DetailView({ p, preset, setPreset, custom, setCustom, amount, error, onGo }: { p: Project; preset: number; setPreset: (n: number) => void; custom: string; setCustom: (s: string) => void; amount: number; error: string; onGo: () => void }) {
  return (
    <article className="mx-auto max-w-6xl px-4 pb-10">
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10">
        <div>
          <header className="relative overflow-hidden rounded-[2rem] bg-fir-deep p-6 sm:p-8">
            <Snow count={20} />
            <div className="relative flex items-center gap-5 sm:gap-8">
              <GiftBox project={p} open className="w-28 shrink-0 sm:w-40" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">{p.kicker}</p>
                <h1 className="mt-1 font-display text-4xl leading-none sm:text-6xl">{p.title}</h1>
                <p className="mt-3 font-display text-lg italic leading-snug text-foreground/90 sm:text-2xl">{p.opening}</p>
              </div>
            </div>
          </header>
          <p className="mt-6 text-lg leading-relaxed">{p.intro}</p>
        </div>

        <section className="glass-strong rounded-3xl p-5 shadow-deep lg:sticky lg:top-24 lg:row-span-2" data-testid="quick-donate">
          <p className="font-display text-2xl">Fai questo regalo</p>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Bastano 5 €. Scegli e conferma: due tocchi.</p>
          <Amounts p={p} preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom} error={error} />
          <button onClick={onGo} disabled={Boolean(error)} aria-describedby={error ? "amount-help" : undefined} className="mt-4 w-full rounded-full bg-primary py-4 text-lg font-semibold text-primary-foreground shadow-deep transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100">
            {error ? "Scegli un importo valido" : `Dona ${amount} €`}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">È una donazione, non un acquisto. Il tuo regalo diventa {p.ornamentName} sull'Albero di Monza.</p>
          <p className="mt-1 text-center text-[11px] text-gold">Demo: nessun pagamento verrà effettuato</p>
        </section>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Vuoi saperne di più?</p>
          <More title={p.doingTitle ?? "Cosa fa Croce Rossa Monza"}>
            <p>{p.story}</p>
            <ul className="mt-3 space-y-1.5">{p.doing.map((d) => <li key={d} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{d}</li>)}</ul>
          </More>
          {p.officialLink && (
            <a href={p.officialLink.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border hairline-gold bg-card/60 px-5 py-4 font-semibold transition hover:text-gold" data-testid="official-link">
              <span>{p.officialLink.label}<span className="mt-0.5 block text-xs font-normal text-muted-foreground">Il sito del progetto · si apre in una nuova scheda</span></span>
              <ExternalLink className="h-5 w-5 shrink-0 text-gold" />
            </a>
          )}
          <More title="Come aiuta il tuo regalo"><p>{p.helps}</p></More>
          <More title="Donazione o acquisto?">
            <p>Il tuo è un regalo a Croce Rossa Italiana – Comitato di Monza: sostiene il progetto nel suo insieme. L'addobbo sull'albero è il simbolo del tuo gesto, non un oggetto comprato.</p>
          </More>
          {p.id === "battito" && (
            <More title="Impara anche tu le manovre salvavita">
              <p>Un DAE serve se qualcuno sa usarlo. Croce Rossa Monza organizza corsi aperti a tutti.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {[[CRI.blsd, "Corso BLSD"], [CRI.primoSoccorso, "Corso di primo soccorso"], [CRI.corsi, "Tutti i corsi"]].map(([h, l]) => (
                  <a key={h} href={h} target="_blank" rel="noreferrer" className="glass inline-flex items-center justify-between gap-2 rounded-full px-4 py-2.5 text-sm font-semibold hover:text-gold">{l} <ExternalLink className="h-4 w-4" /></a>
                ))}
              </div>
            </More>
          )}
        </div>
      </div>
    </article>
  );
}

function Checkout({ p, amount, onEdit, onConfirm }: { p: Project; amount: number; onEdit: () => void; onConfirm: (m: PaymentChoice) => void }) {
  const [method, setMethod] = useState<PaymentChoice>("sumup");
  const methods: { id: PaymentChoice; label: string; sub: string; icon: ReactNode }[] = [
    { id: "sumup", label: "SumUp online", sub: "Carta · simulatore", icon: <CreditCard className="h-5 w-5" /> },
    { id: "paypal", label: "PayPal online", sub: "Simulatore", icon: <span className="font-bold italic">P</span> },
    { id: "cash", label: "Contanti alla casetta", sub: "Piazza San Paolo", icon: <Banknote className="h-5 w-5" /> },
  ];
  return (
    <section className="animate-rise mx-auto max-w-lg px-4 pt-6">
      <span className="rounded-full border hairline-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold">Checkout demo</span>
      <div className="glass mt-5 flex items-center gap-4 rounded-3xl p-4">
        <OrnamentIcon kind={p.ornament} className="w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl">{p.title}</p>
          <button onClick={onEdit} className="text-xs text-muted-foreground underline">Cambia importo</button>
        </div>
        <p className="font-display text-3xl text-gold">{amount} €</p>
      </div>
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
          <p className="mt-1 text-muted-foreground">Nessun collegamento a {method === "sumup" ? "SumUp" : "PayPal"}: non viene aperto alcun pagamento, nessun dato di carta o conto viene richiesto.</p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed hairline-gold p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gold">Contanti · DEMO</p>
          <p className="mt-1 text-muted-foreground">Ricevi un QR con l'importo. Alla casetta un volontario lo scansiona: solo allora l'addobbo compare sull'albero.</p>
        </div>
      )}
      <button onClick={() => onConfirm(method)} className="mt-6 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground shadow-deep">
        {method === "cash" ? "Continua · prepara il QR" : `Simula pagamento di ${amount} €`}
      </button>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">Demo: nessun pagamento verrà effettuato. Nessun dato di pagamento viene raccolto.</p>
    </section>
  );
}

/** The three ways to close a gift: to the city, WhatsApp postcard, email. */
function Choices({ onPick, cash = false }: { onPick: (s: Step) => void; cash?: boolean }) {
  const items = [
    { s: "mine" as Step, t: "È il mio regalo a Monza", d: cash ? "Concludi qui: il tuo addobbo è già sull'albero" : "Appendi il tuo addobbo, anche in forma anonima", i: <Heart className="h-5 w-5" /> },
    { s: "dedica" as Step, t: "Regalalo a una persona", d: "Cartolina da condividere su WhatsApp", i: <MessageCircle className="h-5 w-5" /> },
    { s: "sorpresa" as Step, t: "Mandalo via email", d: "Subito o allo scoccare di Natale", i: <Mail className="h-5 w-5" /> },
  ];
  return (
    <div className="mt-8 space-y-3 text-left">
      {items.map((o) => (
        <button key={o.s} onClick={() => onPick(o.s)} className="glass flex w-full items-center gap-4 rounded-2xl p-4 transition hover:border-gold">
          <span className="rounded-full bg-primary p-3 text-primary-foreground">{o.i}</span>
          <span><span className="block font-display text-lg">{o.t}</span><span className="text-sm text-muted-foreground">{o.d}</span></span>
        </button>
      ))}
    </div>
  );
}

function CashFlow({ p, amount, onConfirmed, onPick }: { p: Project; amount: number; onConfirmed: (ornamentId: string | null) => void; onPick: (s: Step) => void }) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [gift, setGift] = useState<StoredCashGift | null>(null);
  const [status, setStatus] = useState<CashStatus>("pending");
  useEffect(() => {
    const g = loadCashGift();
    if (g && g.project === p.id) { setGift(g); if (g.confirmed) { setStatus("confirmed"); onConfirmed(g.ornament_id ?? null); } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);
  useEffect(() => {
    if (!gift || gift.confirmed) return;
    let on = true;
    const check = () => cashRequestResult(gift.code).then((r) => {
      if (!on) return;
      setStatus(r.status);
      if (r.status === "confirmed") {
        const next = { ...gift, confirmed: true, ornament_id: r.ornament_id };
        saveCashGift(next); setGift(next); onConfirmed(r.ornament_id);
      } else if (r.status !== "pending") clearCashGift();
    }).catch(() => undefined);
    void check();
    const t = setInterval(check, 5000);
    return () => { on = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gift]);
  const submit = async () => {
    const a = amountSchema.safeParse(amount);
    if (!a.success) { setErr(a.error.issues[0]?.message ?? "Importo non valido"); return; }
    const r = dedicaSchema.safeParse({ firma: name, dedica: msg, consent });
    if (!r.success) { setErr(r.error.issues[0]?.message ?? "Dati non validi"); return; }
    setErr(""); setBusy(true);
    try {
      const row = await createCashRequest(p.ornament, a.data, r.data.firma, r.data.dedica, r.data.consent);
      const next: StoredCashGift = { code: row.code, amount_cents: row.amount_cents, expires_at: row.expires_at, kind: p.ornament, project: p.id };
      saveCashGift(next);
      setStatus("pending"); setGift(next); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setErr(e instanceof Error ? e.message : "Errore, riprova"); }
    finally { setBusy(false); }
  };
  const restart = () => { clearCashGift(); setGift(null); setStatus("pending"); };

  if (gift) return (
    <section className="animate-rise mx-auto max-w-lg px-4 pt-6 text-center">
      <span className="rounded-full border hairline-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold">Contanti alla casetta · DEMO</span>
      {status === "confirmed" ? (
        <div data-testid="cash-confirmed">
          <OrnamentIcon kind={p.ornament} className="animate-floaty mx-auto mt-8 w-24" />
          <h1 className="mt-6 font-display text-4xl leading-tight">Grazie! <span className="text-gold">Il tuo addobbo è sull'albero.</span></h1>
          <p className="mt-3 text-sm text-muted-foreground">Un volontario ha confermato il regalo di {euro(gift.amount_cents)} (passaggio simulato). Ora puoi regalarlo a qualcuno: non serve donare di nuovo.</p>
          <Choices onPick={onPick} cash />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link to="/albero" search={gift.ornament_id ? { addobbo: gift.ornament_id } : { trova: 1 }} className="glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"><LocateFixed className="h-4 w-4" /> Trova l'addobbo</Link>
            <button onClick={restart} className="glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"><RotateCcw className="h-4 w-4" /> Nuovo regalo</button>
          </div>
        </div>
      ) : status === "expired" || status === "not_found" ? (
        <>
          <h1 className="mt-6 font-display text-3xl">QR scaduto</h1>
          <p className="mt-2 text-sm text-muted-foreground">Nessun addobbo è stato appeso. Puoi prepararne uno nuovo.</p>
          <button onClick={restart} className="mt-6 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">Prepara un nuovo QR</button>
        </>
      ) : (
        <>
          <h1 className="mt-5 font-display text-3xl leading-tight">Mostra questo QR <span className="text-gold">alla casetta</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">In Piazza San Paolo un volontario lo scansiona. Puoi chiudere la pagina: quando torni qui ritrovi il tuo regalo.</p>
          <div className="mx-auto mt-6 w-full max-w-xs rounded-3xl bg-paper p-5 text-ink shadow-deep">
            <QRCodeSVG value={gift.code} className="h-auto w-full" bgColor="transparent" fgColor="currentColor" level="M" aria-label="QR monouso per la casetta" />
            <p className="mt-4 text-xs uppercase tracking-widest">Importo da versare · demo</p>
            <p className="font-display text-5xl" data-testid="cash-amount">{euro(gift.amount_cents)}</p>
            <p className="mt-2 font-mono text-sm tracking-wider" data-testid="cash-code">{formatCode(gift.code)}</p>
            <p className="mt-1 text-[11px]">{p.title} · valido fino alle {new Date(gift.expires_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <p role="status" className="mt-4 text-xs text-gold">In attesa del volontario… la pagina si aggiorna da sola.</p>
          <p className="mt-2 text-[11px] text-muted-foreground">Il QR contiene solo un codice monouso, nessun dato personale. Demo: nessun pagamento reale.</p>
        </>
      )}
    </section>
  );

  return (
    <section className="mx-auto max-w-lg px-4 pt-6">
      <span className="rounded-full border hairline-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold">Contanti alla casetta · DEMO</span>
      <h1 className="mt-4 font-display text-4xl">Prepara il tuo addobbo</h1>
      <p className="mt-2 text-muted-foreground">{p.title} · <span className="text-gold">{amount} €</span>. Nome e dedica sono facoltativi.</p>
      <div className="mt-5"><Field label="Firma (facoltativa)" maxLength={40} placeholder="Es. Giulia" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={90} rows={3} placeholder="Dedica facoltativa · max 90 caratteri" className="glass mt-4 w-full rounded-2xl p-4 outline-none focus:border-gold" />
      <p className="text-right text-[11px] text-muted-foreground">{msg.length}/90</p>
      <Consent checked={consent} onChange={setConsent} />
      {err && <p role="alert" className="mt-2 text-sm text-primary">{err}</p>}
      <button disabled={busy} onClick={submit} className="mt-4 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Preparo il QR…" : "Genera il QR per la casetta"}</button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Fino alla conferma del volontario nessun addobbo viene appeso e il contatore non cambia.</p>
    </section>
  );
}

function Success({ p, onPick }: { p: Project; onPick: (s: Step) => void }) {
  return (
    <section className="relative mx-auto max-w-lg px-4 pt-8 text-center">
      <Snow count={30} />
      <GiftBox project={p} open className="relative mx-auto w-40" />
      <h1 className="animate-rise mt-4 font-display text-4xl leading-tight">Grazie! <span className="text-gold">A chi lo regali?</span></h1>
      <p className="mt-3 text-sm text-muted-foreground">Simulazione DEMO: nessun importo addebitato. Scegli come appendere {p.ornamentName}.</p>
      <Choices onPick={onPick} />
    </section>
  );
}

function Consent({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="mt-3 flex items-start gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
      <span>{label ?? "Acconsento a pubblicare firma e dedica sull'albero e sullo schermo in piazza, dopo la verifica di un moderatore."} <span className="text-muted-foreground">Facoltativo: senza consenso firma e dedica non vengono salvate.</span></span>
    </label>
  );
}

function hungNote(h: Hung | null) {
  if (!h) return "";
  if (h.error) return `Addobbo non appeso: ${h.error}`;
  if (h.via === "cash") return "Il tuo addobbo è già sull'albero, confermato alla casetta.";
  return h.status === "pending" ? "La dedica pubblica comparirà dopo la moderazione." : h.status === "rejected" ? "Il tuo addobbo è sull'albero, senza testo pubblico." : "";
}

type HangFn = (firma: string, dedica: string, consent: boolean) => Promise<Hung>;

function Mine({ p, hung, hang }: { p: Project; hung: Hung | null; hang: HangFn }) {
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (hung) return <CityThanks project={p} ornamentId={hung.id} note={hungNote(hung)} />;
  const submit = async () => {
    const r = dedicaSchema.safeParse({ firma: name, dedica: msg, consent });
    if (!r.success) { setErr(r.error.issues[0]?.message ?? "Dati non validi"); return; }
    setErr(""); setBusy(true);
    await hang(r.data.firma, r.data.dedica, r.data.consent);
    setBusy(false); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <section className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="font-display text-4xl">Il tuo addobbo per Monza</h1>
      <p className="mt-2 text-muted-foreground">Firma e dedica sono facoltative: puoi restare anonimo.</p>
      <div className="mt-5"><Field label="Firma (facoltativa)" maxLength={40} placeholder="Es. Giulia" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={90} rows={3} placeholder="Dedica facoltativa · max 90 caratteri" className="glass mt-4 w-full rounded-2xl p-4 outline-none focus:border-gold" />
      <p className="text-right text-[11px] text-muted-foreground">{msg.length}/90</p>
      {err && <p className="mt-1 text-sm text-primary">{err}</p>}
      <Consent checked={consent} onChange={setConsent} />
      <button disabled={busy} onClick={submit} className="mt-4 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"><Gift className="mr-2 inline h-5 w-5" />Appendi all'Albero</button>
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

function Dedica({ p, hung, hang, onEmail }: { p: Project; hung: Hung | null; hang: HangFn; onEmail: () => void }) {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [msg, setMsg] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Hung | null>(null);

  const create = async () => {
    const r = postcardSchema.safeParse({ to, from, msg });
    if (!r.success) { setErr(r.error.issues[0]?.message ?? "Dati non validi"); return; }
    setErr(""); setBusy(true);
    // The recipient name never leaves the device; "Da" and dedica are stored only with explicit consent.
    const h = await hang(consent ? r.data.from : "", consent ? r.data.msg : "", consent);
    setCreated(h); setBusy(false); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (created) return (
    <section className="animate-rise mx-auto max-w-5xl px-4 pt-6">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gold">La tua cartolina · demo</p>
      <h1 className="mt-2 font-display text-4xl leading-tight">Per {to.trim()}, <span className="text-gold">con amore da Monza.</span></h1>
      <div className="mt-6"><PostcardStudio project={p} to={to.trim()} from={from.trim()} msg={msg.trim()} ornamentId={created.id} status={hungNote(created)} /></div>
      <div className="mx-auto mt-3 max-w-lg"><button onClick={onEmail} className="glass flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"><Mail className="h-4 w-4" /> Mandala anche via email</button></div>
    </section>
  );

  return (
    <section className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="font-display text-4xl">Regalalo a una persona</h1>
      <p className="mt-2 text-muted-foreground">Crea la cartolina di “{p.title}” da mandare su WhatsApp.</p>
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
        {!hung && <Consent checked={consent} onChange={setConsent} label="Pubblica anche “Da” e dedica sull'albero e sullo schermo in piazza, dopo la verifica di un moderatore." />}
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-primary">{err}</p>}
      <button disabled={busy} onClick={create} className="mt-6 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Preparo la cartolina…" : "Crea la cartolina"}</button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Demo: nessuna donazione reale. Il nome del destinatario resta solo su questo dispositivo.</p>
    </section>
  );
}

function Sorpresa({ p, hung, hang }: { p: Project; hung: Hung | null; hang: HangFn }) {
  const [consent, setConsent] = useState(false);
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <EmailStudio
        project={p}
        ornamentId={hung?.id ?? null}
        title="Regalalo via email"
        subtitle="Scegli se farlo arrivare subito o allo scoccare della mezzanotte di Natale (25 dicembre, 00:05)."
        consentSlot={!hung && <Consent checked={consent} onChange={setConsent} label="Pubblica anche il tuo nome e la dedica sull'albero, dopo la verifica di un moderatore." />}
        onConfirm={async ({ donor, msg }) => {
          // The email preview stays available even if the tree is busy; the link then points to the Albero.
          const h = await hang(consent ? donor : "", consent ? msg : "", consent);
          return h.id;
        }}
      />
    </section>
  );
}
