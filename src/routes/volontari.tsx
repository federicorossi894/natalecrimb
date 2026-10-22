import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Camera, CheckCircle2, Keyboard, PlusCircle, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { AuthBox } from "@/components/xmas/AuthBox";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { PROJECTS, type OrnamentKind } from "@/lib/data";
import { DESK_METHOD_LABEL, euro, formatCode, isCompleteCode, manualOrnamentSchema, normalizeCode, projectForKind, type DeskMethod } from "@/lib/cash";

const QrScanner = lazy(() => import("@/components/xmas/QrScanner"));

export const Route = createFileRoute("/volontari")({
  head: () => ({
    meta: [
      { title: "Area volontari (demo) – CRI Monza" },
      { name: "description", content: "Area riservata ai volontari della casetta CRI per confermare i regali in contanti (demo)." },
      { property: "og:title", content: "Area volontari · demo" },
      { property: "og:description", content: "Area riservata ai volontari della casetta CRI Monza." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Volontari,
});

function Volontari() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [view, setView] = useState<"home" | "scan" | "manual">("home");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setAllowed(null); return; }
    void supabase.rpc("is_volunteer").then(({ data }) => setAllowed(!!data));
  }, [session]);

  return (
    <Shell>
      <PageHead kicker="DEMO · Area riservata" title="Casetta CRI · volontari" />
      <section className="mx-auto max-w-lg px-4 pb-16">
        {!ready ? null : !session ? <AuthBox title="Accesso volontari" returnPath="/volontari" roleName="volontario" /> : allowed === null ? null : !allowed ? (
          <div className="glass rounded-2xl p-5 text-sm">
            <p>Sei connesso come <b>{session.user.email}</b>, ma il tuo account non ha ancora il ruolo di volontario.</p>
            <p className="mt-2 text-muted-foreground">Chiedi a un amministratore del Comitato di abilitarti.</p>
            <button onClick={() => supabase.auth.signOut()} className="mt-3 text-xs underline">Esci</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Volontario: {session.user.email}</span>
              <button onClick={() => supabase.auth.signOut()} className="underline">Esci</button>
            </div>
            <p className="mt-3 rounded-2xl border hairline-gold px-4 py-3 text-xs text-gold">DEMO · Contanti e POS sono passaggi simulati: nessun incasso reale, nessun POS collegato.</p>
            {view === "home" && (
              <div className="mt-5 grid gap-3">
                <button onClick={() => setView("scan")} className="flex items-center gap-4 rounded-3xl bg-primary p-6 text-left text-primary-foreground shadow-deep">
                  <ScanLine className="h-9 w-9 shrink-0" /><span><span className="block font-display text-2xl">Scansiona QR</span><span className="text-sm opacity-90">Regalo in contanti prenotato dal telefono</span></span>
                </button>
                <button onClick={() => setView("manual")} className="glass flex items-center gap-4 rounded-3xl p-6 text-left">
                  <PlusCircle className="h-9 w-9 shrink-0 text-gold" /><span><span className="block font-display text-2xl">Inserisci pallina manualmente</span><span className="text-sm text-muted-foreground">Per chi dona alla casetta senza telefono</span></span>
                </button>
              </div>
            )}
            {view !== "home" && <button onClick={() => setView("home")} className="mt-5 text-sm text-muted-foreground underline">← Torna alla dashboard</button>}
            {view === "scan" && <ScanFlow />}
            {view === "manual" && <ManualFlow />}
          </>
        )}
      </section>
    </Shell>
  );
}

type Lookup = { status: string; kind: string; amount_cents: number; firma: string | null; dedica: string | null; publish_consent: boolean; expires_at: string; confirmed_at: string | null; method: string | null };
const RESULT_TEXT = {
  confirmed: "Regalo confermato: la pallina è stata appesa all'albero condiviso.",
  already_confirmed: "Questo QR era già stato confermato: nessuna pallina aggiunta, nessun doppio incasso.",
  expired: "Richiesta scaduta: chiedi al donatore di generare un nuovo QR.",
  not_found: "Codice non trovato. Controlla e riprova.",
} as const satisfies Record<string, string>;

function ScanFlow() {
  const [camera, setCamera] = useState(false);
  const [code, setCode] = useState("");
  const [req, setReq] = useState<Lookup | null>(null);
  const [msg, setMsg] = useState("");
  const [method, setMethod] = useState<DeskMethod>("cash");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ result: string; ornament_status: string | null } | null>(null);

  const lookup = useCallback(async (raw: string) => {
    setResult(null); setReq(null);
    if (!isCompleteCode(raw)) { setMsg("Il codice ha 16 caratteri (lettere e numeri)."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("cash_request_lookup", { _code: normalizeCode(raw) });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    const row = data?.[0];
    if (!row) { setMsg(RESULT_TEXT.not_found); return; }
    setMsg(""); setReq(row);
  }, []);
  const onScan = useCallback((text: string) => { setCamera(false); setCode(formatCode(text)); void lookup(text); }, [lookup]);
  const confirm = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("confirm_cash_request", { _code: normalizeCode(code), _method: method });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    const r = data?.[0];
    setResult(r ? { result: r.result, ornament_status: r.ornament_status } : null);
    if (r?.result === "confirmed" || r?.result === "already_confirmed") setReq((q) => (q ? { ...q, status: "confirmed" } : q));
  };
  const p = req ? projectForKind(req.kind) : undefined;

  return (
    <div className="mt-4 space-y-4">
      {camera ? (
        <ClientOnly><Suspense fallback={<div className="glass aspect-square rounded-3xl" />}><QrScanner onCode={onScan} /></Suspense></ClientOnly>
      ) : (
        <button onClick={() => { setCamera(true); setReq(null); setResult(null); }} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-primary-foreground"><Camera className="h-5 w-5" /> Apri la fotocamera</button>
      )}
      <form onSubmit={(e) => { e.preventDefault(); setCamera(false); void lookup(code); }} className="glass rounded-2xl p-4">
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" htmlFor="cash-code"><Keyboard className="mr-1 inline h-4 w-4" /> Oppure inserisci il codice</label>
        <div className="mt-2 flex gap-2">
          <input id="cash-code" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(formatCode(e.target.value).slice(0, 19))} className="glass min-w-0 flex-1 rounded-xl px-3 py-3 font-mono tracking-wider outline-none" />
          <button disabled={busy} className="rounded-xl bg-fir px-4 font-semibold text-snow disabled:opacity-60">Cerca</button>
        </div>
      </form>
      {msg && <p role="alert" className="text-sm text-gold">{msg}</p>}
      {req && (
        <div className="glass-strong rounded-3xl p-5 shadow-deep" data-testid="cash-request">
          <div className="flex items-center gap-4">
            <OrnamentIcon kind={req.kind as OrnamentKind} className="w-14 shrink-0" />
            <div className="min-w-0 flex-1"><p className="font-display text-xl">{p?.title ?? req.kind}</p><p className="text-xs text-muted-foreground">{p?.ornamentName}</p></div>
          </div>
          <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Importo da ricevere · demo</p>
          <p className="font-display text-5xl text-gold" data-testid="cash-amount">{euro(req.amount_cents)}</p>
          <p className="mt-3 text-sm">{req.publish_consent && (req.firma || req.dedica) ? <>Dedica (pubblicata solo dopo moderazione): <i>“{req.dedica ?? ""}”</i> — {req.firma ?? "Anonimo"}</> : <span className="text-muted-foreground">Addobbo anonimo, nessun testo da pubblicare.</span>}</p>
          {req.status === "pending" && !result && (
            <>
              <div role="radiogroup" aria-label="Metodo di incasso" className="mt-5 grid gap-2">
                {(Object.keys(DESK_METHOD_LABEL) as DeskMethod[]).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className={`rounded-2xl border px-4 py-3 text-left text-sm ${method === m ? "border-gold bg-secondary" : "glass"}`}>
                    {DESK_METHOD_LABEL[m]} <span className="text-[10px] uppercase text-gold">· simulato</span>
                  </button>
                ))}
              </div>
              <button disabled={busy} onClick={confirm} className="mt-4 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60">Conferma e appendi la pallina</button>
            </>
          )}
          {req.status === "expired" && <p className="mt-4 text-sm text-gold">{RESULT_TEXT.expired}</p>}
          {req.status === "confirmed" && !result && <p className="mt-4 text-sm text-gold">{RESULT_TEXT.already_confirmed}</p>}
          {result && (
            <p role="status" className="mt-4 flex items-start gap-2 text-sm"><CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
              <span>{(RESULT_TEXT as Record<string, string>)[result.result] ?? result.result}{result.result === "confirmed" && result.ornament_status === "pending" ? " La dedica attende la moderazione." : ""}</span></p>
          )}
        </div>
      )}
    </div>
  );
}

function ManualFlow() {
  const [kind, setKind] = useState<OrnamentKind>("cuore");
  const [amount, setAmount] = useState("10");
  const [method, setMethod] = useState<DeskMethod>("cash");
  const [firma, setFirma] = useState("");
  const [dedica, setDedica] = useState("");
  const [consent, setConsent] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = manualOrnamentSchema.safeParse({ kind, amount, method, firma, dedica, consent, simulated });
    if (!r.success) { setMsg(r.error.issues[0]?.message ?? "Dati non validi"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("volunteer_add_ornament", {
      _kind: r.data.kind, _amount_cents: r.data.amount * 100, _method: r.data.method,
      _firma: r.data.consent ? r.data.firma : "", _dedica: r.data.consent ? r.data.dedica : "", _consent: r.data.consent,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    const st = data?.[0]?.status;
    setMsg(`Pallina appesa all'albero condiviso (${euro(r.data.amount * 100)}, ${DESK_METHOD_LABEL[r.data.method].toLowerCase()} · simulato).${st === "pending" ? " La dedica attende la moderazione." : st === "rejected" ? " La dedica non è pubblicabile: la pallina resta senza testo." : ""}`);
    setFirma(""); setDedica(""); setConsent(false); setSimulated(false);
  };
  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Progetto</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PROJECTS.map((p) => (
            <button type="button" key={p.id} aria-pressed={kind === p.ornament} onClick={() => setKind(p.ornament)} className={`flex items-center gap-2 rounded-2xl border p-3 text-left text-sm ${kind === p.ornament ? "border-gold bg-secondary" : "glass"}`}>
              <OrnamentIcon kind={p.ornament} className="w-8 shrink-0" />{p.title}
            </button>
          ))}
        </div>
      </div>
      <label className="block"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Importo (€) · demo</span>
        <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 4))} className="glass mt-1.5 w-full rounded-xl px-4 py-3 font-display text-2xl outline-none" /></label>
      <div role="radiogroup" aria-label="Metodo di incasso" className="grid gap-2">
        {(Object.keys(DESK_METHOD_LABEL) as DeskMethod[]).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className={`rounded-2xl border px-4 py-3 text-left text-sm ${method === m ? "border-gold bg-secondary" : "glass"}`}>{DESK_METHOD_LABEL[m]} <span className="text-[10px] uppercase text-gold">· simulato</span></button>
        ))}
      </div>
      <label className="block"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Firma (facoltativa)</span>
        <input maxLength={40} value={firma} onChange={(e) => setFirma(e.target.value)} className="glass mt-1.5 w-full rounded-xl px-4 py-3 outline-none" /></label>
      <label className="block"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dedica (facoltativa)</span>
        <textarea maxLength={90} rows={2} value={dedica} onChange={(e) => setDedica(e.target.value)} className="glass mt-1.5 w-full rounded-xl p-4 outline-none" /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
        <span>Il donatore acconsente a pubblicare firma e dedica sull'albero e sullo schermo, dopo moderazione. <span className="text-muted-foreground">Senza consenso, firma e dedica non vengono salvate.</span></span></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={simulated} onChange={(e) => setSimulated(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
        <span>Confermo che in questa demo l'incasso è solo simulato.</span></label>
      {msg && <p role="status" className="text-sm text-gold">{msg}</p>}
      <button disabled={busy} className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60">Conferma e appendi la pallina</button>
    </form>
  );
}
