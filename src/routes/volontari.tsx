import { CAMPAIGN } from "@/lib/campaign";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Gift,
  Keyboard,
  Mail,
  PenLine,
  PlusCircle,
  Presentation,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrnamentIcon } from "@/components/xmas/Ornament";
import { PROJECTS, type OrnamentKind } from "@/lib/data";
import { EmailStudio } from "@/components/xmas/PostDonation";
import { QRCodeSVG } from "qrcode.react";
import {
  createDemoDesk,
  DEMO_CODE,
  type DemoEntry,
  type DeskApi,
  type DeskLookup,
} from "@/lib/volunteer-demo";
import { WishTokenDesk } from "@/components/xmas/WishWall";
import { createDemoWishApi, realWishApi } from "@/lib/wishes";
import {
  DESK_METHOD_LABEL,
  euro,
  formatCode,
  isCompleteCode,
  manualOrnamentSchema,
  normalizeCode,
  projectForKind,
  type DeskMethod,
} from "@/lib/cash";
import { volunteerLogin, volunteerLogout, volunteerMe, volunteerRpc, createSharedWishToken } from "@/lib/volunteer-session.functions";

const QrScanner = lazy(() => import("@/components/xmas/QrScanner"));

export const Route = createFileRoute("/volontari")({
  head: () => ({
    meta: [
      { title: "Area volontari · CRI Monza" },
      {
        name: "description",
        content: "Area riservata ai volontari della casetta CRI Monza per confermare i regali alla casetta.",
      },
      { property: "og:title", content: "Area volontari · CRI Monza" },
      { property: "og:description", content: "Area riservata ai volontari della casetta CRI Monza." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Volontari,
});

type Me = { name: string; expiresAt: string } | null;

function Volontari() {
  const me = useServerFn(volunteerMe);
  const login = useServerFn(volunteerLogin);
  const logout = useServerFn(volunteerLogout);
  const rpc = useServerFn(volunteerRpc);
  const [user, setUser] = useState<Me | undefined>(undefined);
  const [localPresentation, setLocalPresentation] = useState(false);
  const [view, setView] = useState<"home" | "scan" | "manual" | "wish">("home");
  const createWish = useServerFn(createSharedWishToken);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    me().then(setUser, () => setUser(null));
  }, [me]);
  const api = useMemo(() => sharedApi((n, a) => rpc({ data: { name: n, args: a } }), () => setUser(null)), [rpc]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await login({ data: { name, password } });
      if (r.ok) {
        setPassword("");
        setUser({ name: r.name, expiresAt: r.expiresAt });
      } else setErr(r.error);
    } catch {
      setErr("Accesso momentaneamente non disponibile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell hidePiazzaPill>
      <PageHead kicker={CAMPAIGN.demo ? "DEMO · nessun incasso reale" : "Area riservata"} title="Area volontari · CRI Monza" />
      <section className="mx-auto max-w-lg px-4 pb-16">
        {user === undefined ? null : !user ? (
          <>
            <form onSubmit={submit} className="glass grid gap-4 rounded-3xl p-5" data-testid="volunteer-login">
              <div className="grid gap-1.5">
                <Label htmlFor="vol-name">Nome e cognome</Label>
                <Input id="vol-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vol-pass">Password</Label>
                <Input id="vol-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={200} required />
              </div>
              {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
              <Button type="submit" size="lg" disabled={busy}>{busy ? "Verifica…" : "Entra"}</Button>
              {CAMPAIGN.demo && (
                <p className="text-xs text-muted-foreground">
                  DEMO condivisa · due telefoni + TV: contanti e POS simulati, nessun incasso reale.
                </p>
              )}
            </form>
            {CAMPAIGN.demo && (
              <div className="mt-8 border-t pt-5">
                <Button
                  variant="outline"
                  onClick={() => setLocalPresentation((v) => !v)}
                  className="h-auto w-full whitespace-normal py-3"
                >
                  <Presentation />
                  {localPresentation ? "Chiudi presentazione locale" : "Presentazione locale · un solo telefono"}
                </Button>
                {localPresentation && (
                  <div className="mt-4">
                    <DemoMode />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span data-testid="volunteer-name">Accesso come <b>{user.name}</b></span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await logout().catch(() => undefined);
                  setUser(null);
                  setView("home");
                }}
              >
                Esci
              </Button>
            </div>
            {CAMPAIGN.demo && (
              <div className="mt-4 border-b pb-4">
                <h2 className="font-display text-2xl">DEMO condivisa · due telefoni + TV</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nessun incasso reale, nessun POS collegato. Le conferme aggiungono una sola pallina
                  persistente all’albero DEMO condiviso.
                </p>
              </div>
            )}
            {view === "home" && (
              <div className="mt-5 grid gap-3">
                <button
                  onClick={() => setView("scan")}
                  className="flex items-center gap-4 rounded-3xl bg-primary p-6 text-left text-primary-foreground shadow-deep"
                >
                  <ScanLine className="h-9 w-9 shrink-0" />
                  <span>
                    <span className="block font-display text-2xl">Scansiona QR</span>
                    <span className="text-sm opacity-90">Regalo in contanti prenotato dal telefono</span>
                  </span>
                </button>
                <button onClick={() => setView("manual")} className="glass flex items-center gap-4 rounded-3xl p-6 text-left">
                  <PlusCircle className="h-9 w-9 shrink-0 text-gold" />
                  <span>
                    <span className="block font-display text-2xl">Inserisci pallina</span>
                    <span className="text-sm text-muted-foreground">Per chi dona alla casetta senza telefono</span>
                  </span>
                </button>
                {CAMPAIGN.volunteerPurchaseWishQR && (
                  <button onClick={() => setView("wish")} className="glass flex items-center gap-4 rounded-3xl p-6 text-left" data-testid="shared-wish">
                    <PenLine className="h-9 w-9 shrink-0 text-gold" />
                    <span>
                      <span className="block font-display text-2xl">Acquisto alla casetta</span>
                      <span className="text-sm text-muted-foreground">QR monouso per lasciare un augurio</span>
                    </span>
                  </button>
                )}
              </div>
            )}
            {view !== "home" && (
              <button onClick={() => setView("home")} className="mt-5 text-sm text-muted-foreground underline">
                ← Torna alla dashboard
              </button>
            )}
            {view === "scan" && <ScanFlow api={api} />}
            {view === "manual" && <ManualFlow api={api} />}
            {view === "wish" && CAMPAIGN.volunteerPurchaseWishQR && <WishTokenDesk create={() => createWish()} api={realWishApi} />}
          </>
        )}
      </section>
    </Shell>
  );
}

type Lookup = DeskLookup;
type Call = (name: "cash_request_lookup" | "confirm_cash_request" | "volunteer_add_ornament", args: Record<string, string | number | boolean>) => Promise<unknown>;
/** Shared-password session API: identity comes from the HttpOnly cookie on the server, never from args. */
export function sharedApi(call: Call, onExpired: () => void): DeskApi {
  const run = async <T,>(n: Parameters<Call>[0], a: Parameters<Call>[1]) => {
    try {
      return (await call(n, a)) as T;
    } catch (e) {
      if (e instanceof Error && /Sessione scaduta/.test(e.message)) onExpired();
      throw e;
    }
  };
  return {
    async lookup(code) {
      const data = await run<Lookup[]>("cash_request_lookup", { _code: normalizeCode(code) });
      return data?.[0] ?? null;
    },
    async confirm(code, method) {
      const data = await run<{ result: string; ornament_status: string | null }[]>("confirm_cash_request", { _code: normalizeCode(code), _method: method });
      const r = data?.[0];
      return { result: r?.result ?? "not_found", ornament_status: r?.ornament_status ?? null };
    },
    async add(i) {
      const data = await run<{ id: string; status: string }[]>("volunteer_add_ornament", {
        _kind: i.kind,
        _amount_cents: i.amount_cents,
        _method: i.method,
        _firma: i.consent ? i.firma : "",
        _dedica: i.consent ? i.dedica : "",
        _consent: i.consent,
      });
      return { status: data?.[0]?.status ?? "pending", id: data?.[0]?.id ?? null };
    },
  };
}
const RESULT_TEXT = {
  confirmed: "Regalo confermato: la pallina è stata appesa all'albero condiviso.",
  already_confirmed:
    "Questo QR era già stato confermato: nessuna pallina aggiunta, nessun doppio incasso.",
  expired: "Richiesta scaduta: chiedi al donatore di generare un nuovo QR.",
  not_found: "Codice non trovato. Controlla e riprova.",
} as const satisfies Record<string, string>;

function ScanFlow({
  api,
  demo = false,
  onScanDemo,
}: {
  api: DeskApi;
  demo?: boolean;
  onScanDemo?: () => string;
}) {
  const [camera, setCamera] = useState(false);
  const [code, setCode] = useState("");
  const [req, setReq] = useState<Lookup | null>(null);
  const [msg, setMsg] = useState("");
  const [method, setMethod] = useState<DeskMethod>("cash");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ result: string; ornament_status: string | null } | null>(
    null,
  );

  const lookup = useCallback(
    async (raw: string) => {
      setResult(null);
      setReq(null);
      if (!isCompleteCode(raw)) {
        setMsg("Il codice ha 16 caratteri (lettere e numeri).");
        return;
      }
      setBusy(true);
      try {
        const row = await api.lookup(raw);
        if (!row) {
          setMsg(RESULT_TEXT.not_found);
          return;
        }
        setMsg("");
        setReq(row);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Errore");
      } finally {
        setBusy(false);
      }
    },
    [api],
  );
  const onScan = useCallback(
    (text: string) => {
      setCamera(false);
      setCode(formatCode(text));
      void lookup(text);
    },
    [lookup],
  );
  const confirm = async () => {
    setBusy(true);
    let r: { result: string; ornament_status: string | null };
    try {
      r = await api.confirm(code, method);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Errore");
      setBusy(false);
      return;
    }
    setBusy(false);
    setResult(r);
    if (r?.result === "confirmed" || r?.result === "already_confirmed")
      setReq((q) => (q ? { ...q, status: "confirmed" } : q));
  };
  const p = req ? projectForKind(req.kind) : undefined;

  return (
    <div className="mt-4 space-y-4">
      {camera ? (
        <ClientOnly>
          <Suspense fallback={<div className="glass aspect-square rounded-3xl" />}>
            <QrScanner onCode={onScan} />
          </Suspense>
        </ClientOnly>
      ) : (
        <button
          onClick={() => {
            setCamera(true);
            setReq(null);
            setResult(null);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-primary-foreground"
        >
          <Camera className="h-5 w-5" /> Apri la fotocamera
        </button>
      )}
      {demo && onScanDemo && (
        <button
          type="button"
          onClick={() => onScan(onScanDemo())}
          className="glass flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"
        >
          <ScanLine className="h-4 w-4 text-gold" /> Simula scansione del QR di esempio
        </button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setCamera(false);
          void lookup(code);
        }}
        className="glass rounded-2xl p-4"
      >
        <label
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          htmlFor="cash-code"
        >
          <Keyboard className="mr-1 inline h-4 w-4" /> Oppure inserisci il codice
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="cash-code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(formatCode(e.target.value).slice(0, 19))}
            className="glass min-w-0 flex-1 rounded-xl px-3 py-3 font-mono tracking-wider outline-none"
          />
          <button
            disabled={busy}
            className="rounded-xl bg-fir px-4 font-semibold text-snow disabled:opacity-60"
          >
            Cerca
          </button>
        </div>
      </form>
      {msg && (
        <p role="alert" className="text-sm text-gold">
          {msg}
        </p>
      )}
      {req && (
        <div className="glass-strong rounded-3xl p-5 shadow-deep" data-testid="cash-request">
          <div className="flex items-center gap-4">
            <OrnamentIcon kind={req.kind as OrnamentKind} className="w-14 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl">{p?.title ?? req.kind}</p>
              <p className="text-xs text-muted-foreground">{p?.ornamentName}</p>
            </div>
          </div>
          <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
            Importo da ricevere · demo
          </p>
          <p className="font-display text-5xl text-gold" data-testid="cash-amount">
            {euro(req.amount_cents)}
          </p>
          <p className="mt-3 text-sm">
            {req.publish_consent && (req.firma || req.dedica) ? (
              <>
                Dedica (pubblicata solo dopo moderazione): <i>“{req.dedica ?? ""}”</i> —{" "}
                {req.firma ?? "Anonimo"}
              </>
            ) : (
              <span className="text-muted-foreground">
                Addobbo anonimo, nessun testo da pubblicare.
              </span>
            )}
          </p>
          {req.status === "pending" && !result && (
            <>
              <div role="radiogroup" aria-label="Metodo di incasso" className="mt-5 grid gap-2">
                {(Object.keys(DESK_METHOD_LABEL) as DeskMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={method === m}
                    onClick={() => setMethod(m)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm ${method === m ? "border-gold bg-secondary" : "glass"}`}
                  >
                    {DESK_METHOD_LABEL[m]}{" "}
                    <span className="text-[10px] uppercase text-gold">· simulato</span>
                  </button>
                ))}
              </div>
              <button
                disabled={busy}
                onClick={confirm}
                className="mt-4 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"
              >
                Conferma e appendi la pallina
              </button>
            </>
          )}
          {req.status === "expired" && (
            <p className="mt-4 text-sm text-gold">{RESULT_TEXT.expired}</p>
          )}
          {req.status === "confirmed" && !result && (
            <p className="mt-4 text-sm text-gold">{RESULT_TEXT.already_confirmed}</p>
          )}
          {result && (
            <p role="status" className="mt-4 flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
              <span>
                {demo && result.result === "confirmed"
                  ? "Presentazione: regalo confermato in simulazione. Nessuna pallina sull'albero vero, nessun incasso."
                  : ((RESULT_TEXT as Record<string, string>)[result.result] ?? result.result)}
                {result.result === "confirmed" && result.ornament_status === "pending"
                  ? " La dedica attende la moderazione."
                  : ""}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ManualFlow({ api, demo = false }: { api: DeskApi; demo?: boolean }) {
  const [kind, setKind] = useState<OrnamentKind>("cuore");
  const [amount, setAmount] = useState("10");
  const [method, setMethod] = useState<DeskMethod>("cash");
  const [firma, setFirma] = useState("");
  const [dedica, setDedica] = useState("");
  const [consent, setConsent] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    kind: OrnamentKind;
    firma: string;
    dedica: string;
    id: string | null;
    text: string;
  } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = manualOrnamentSchema.safeParse({
      kind,
      amount,
      method,
      firma,
      dedica,
      consent,
      simulated,
    });
    if (!r.success) {
      setMsg(r.error.issues[0]?.message ?? "Dati non validi");
      return;
    }
    setBusy(true);
    let res: { status: string; id?: string | null };
    try {
      res = await api.add({
        kind: r.data.kind,
        amount_cents: r.data.amount * 100,
        method: r.data.method,
        firma: r.data.firma,
        dedica: r.data.dedica,
        consent: r.data.consent,
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Errore");
      setBusy(false);
      return;
    }
    setBusy(false);
    const st = res.status;
    setMsg("");
    setDone({
      kind: r.data.kind,
      firma: r.data.firma,
      dedica: r.data.dedica,
      id: res.id ?? null,
      text: `${demo ? "Presentazione: pallina simulata, nessun dato salvato" : "Pallina appesa all'albero condiviso"} (${euro(r.data.amount * 100)}, ${DESK_METHOD_LABEL[r.data.method].toLowerCase()} · simulato).${st === "pending" ? " La dedica attende la moderazione." : st === "rejected" ? " La dedica non è pubblicabile: la pallina resta senza testo." : ""}`,
    });
    setFirma("");
    setDedica("");
    setConsent(false);
    setSimulated(false);
  };
  if (done) return <DeskAfter {...done} demo={demo} onEnd={() => setDone(null)} />;
  const fillExample = () => {
    setKind("calore");
    setAmount("25");
    setMethod("pos_manual");
    setFirma("Famiglia Rossi");
    setDedica("Una coperta calda per chi vive in strada");
    setConsent(true);
    setSimulated(true);
    setMsg("");
  };
  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      {demo && (
        <button
          type="button"
          onClick={fillExample}
          className="glass w-full rounded-full py-3 text-sm font-semibold"
        >
          Compila con dati di esempio
        </button>
      )}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Progetto
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PROJECTS.map((p) => (
            <button
              type="button"
              key={p.id}
              aria-pressed={kind === p.ornament}
              onClick={() => setKind(p.ornament)}
              className={`flex items-center gap-2 rounded-2xl border p-3 text-left text-sm ${kind === p.ornament ? "border-gold bg-secondary" : "glass"}`}
            >
              <OrnamentIcon kind={p.ornament} className="w-8 shrink-0" />
              {p.title}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Importo (€) · demo
        </span>
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="glass mt-1.5 w-full rounded-xl px-4 py-3 font-display text-2xl outline-none"
        />
      </label>
      <div role="radiogroup" aria-label="Metodo di incasso" className="grid gap-2">
        {(Object.keys(DESK_METHOD_LABEL) as DeskMethod[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={method === m}
            onClick={() => setMethod(m)}
            className={`rounded-2xl border px-4 py-3 text-left text-sm ${method === m ? "border-gold bg-secondary" : "glass"}`}
          >
            {DESK_METHOD_LABEL[m]}{" "}
            <span className="text-[10px] uppercase text-gold">· simulato</span>
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Firma (facoltativa)
        </span>
        <input
          maxLength={40}
          value={firma}
          onChange={(e) => setFirma(e.target.value)}
          className="glass mt-1.5 w-full rounded-xl px-4 py-3 outline-none"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Dedica (facoltativa)
        </span>
        <textarea
          maxLength={90}
          rows={2}
          value={dedica}
          onChange={(e) => setDedica(e.target.value)}
          className="glass mt-1.5 w-full rounded-xl p-4 outline-none"
        />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--gold)]"
        />
        <span>
          Il donatore acconsente a pubblicare firma e dedica sull'albero e sullo schermo, dopo
          moderazione.{" "}
          <span className="text-muted-foreground">
            Senza consenso, firma e dedica non vengono salvate.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={simulated}
          onChange={(e) => setSimulated(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--gold)]"
        />
        <span>Confermo che in questa demo l'incasso è solo simulato.</span>
      </label>
      {msg && (
        <p role="status" className="text-sm text-gold">
          {msg}
        </p>
      )}
      <button
        disabled={busy}
        className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"
      >
        Conferma e appendi la pallina
      </button>
    </form>
  );
}

/** After a manual entry: finish, or send the donor a (simulated) email postcard, or gift it to someone by email. */
function DeskAfter({
  kind,
  firma,
  dedica,
  id,
  text,
  demo,
  onEnd,
}: {
  kind: OrnamentKind;
  firma: string;
  dedica: string;
  id: string | null;
  text: string;
  demo: boolean;
  onEnd: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "donor" | "recipient">("choose");
  const p = projectForKind(kind) ?? PROJECTS[0];
  if (!p) return null;
  return (
    <div className="mt-4 space-y-4" data-testid="desk-after">
      <p
        role="status"
        className="flex items-start gap-2 rounded-2xl border hairline-gold p-4 text-sm"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
        {text}
      </p>
      {mode === "choose" ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            E adesso?
          </p>
          <button
            onClick={onEnd}
            className="glass flex items-center gap-3 rounded-2xl p-4 text-left"
          >
            <CheckCircle2 className="h-6 w-6 shrink-0 text-gold" />
            <span>
              <span className="block font-display text-lg">Termina</span>
              <span className="text-xs text-muted-foreground">
                Torna al modulo per il prossimo donatore
              </span>
            </span>
          </button>
          <button
            onClick={() => setMode("donor")}
            className="glass flex items-center gap-3 rounded-2xl p-4 text-left"
          >
            <Mail className="h-6 w-6 shrink-0 text-gold" />
            <span>
              <span className="block font-display text-lg">Invia la cartolina al donatore</span>
              <span className="text-xs text-muted-foreground">
                Email simulata con il link al suo addobbo
              </span>
            </span>
          </button>
          <button
            onClick={() => setMode("recipient")}
            className="glass flex items-center gap-3 rounded-2xl p-4 text-left"
          >
            <Gift className="h-6 w-6 shrink-0 text-gold" />
            <span>
              <span className="block font-display text-lg">Regalalo a un destinatario</span>
              <span className="text-xs text-muted-foreground">
                Email simulata, subito o il 25 dicembre alle 00:05
              </span>
            </span>
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setMode("choose")}
            className="text-sm text-muted-foreground underline"
          >
            ← Altre opzioni
          </button>
          <EmailStudio
            project={p}
            audience={mode}
            ornamentId={id}
            demo={demo}
            defaults={{ donor: firma, msg: dedica }}
          />
          <button
            onClick={onEnd}
            className="w-full rounded-full bg-fir py-3.5 font-semibold text-snow"
          >
            Termina
          </button>
        </>
      )}
    </div>
  );
}

/** Public presentation mode: same flows, in-memory sandbox (src/lib/volunteer-demo.ts), no Cloud calls. */
function DemoMode() {
  const [log, setLog] = useState<DemoEntry[]>([]);
  const [run, setRun] = useState(0);
  const [view, setView] = useState<"home" | "scan" | "manual" | "wish">("home");
  const wishApi = useMemo(() => createDemoWishApi(), [run]);
  const [example, setExample] = useState(DEMO_CODE);
  const api = useMemo(() => createDemoDesk((e) => setLog((l) => [e, ...l])), [run]);
  const total = log.reduce((t, e) => t + e.amount_cents, 0);
  return (
    <div data-testid="demo-mode">
      <div className="rounded-3xl border-2 border-dashed hairline-gold p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
          <Presentation className="h-4 w-4" /> Presentazione locale · un solo telefono
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Solo su questo telefono, azzerata al refresh: nessun dato salvato o condiviso con altri
          telefoni o TV, nessuna pallina sull’albero condiviso, nessun incasso.
        </p>
      </div>
      {view === "home" ? (
        <div className="mt-5 grid gap-3">
          <button
            onClick={() => setView("scan")}
            className="flex items-center gap-4 rounded-3xl bg-primary p-6 text-left text-primary-foreground shadow-deep"
          >
            <ScanLine className="h-9 w-9 shrink-0" />
            <span>
              <span className="block font-display text-2xl">Scansiona QR</span>
              <span className="text-sm opacity-90">Prova con il QR di esempio</span>
            </span>
          </button>
          <button
            onClick={() => setView("manual")}
            className="glass flex items-center gap-4 rounded-3xl p-6 text-left"
          >
            <PlusCircle className="h-9 w-9 shrink-0 text-gold" />
            <span>
              <span className="block font-display text-2xl">Inserisci pallina manualmente</span>
              <span className="text-sm text-muted-foreground">Dati di esempio già pronti</span>
            </span>
          </button>
          <button
            onClick={() => setView("wish")}
            className="glass flex items-center gap-4 rounded-3xl p-6 text-left"
            data-testid="demo-wish"
          >
            <PenLine className="h-9 w-9 shrink-0 text-gold" />
            <span>
              <span className="block font-display text-2xl">Acquisto alla casetta</span>
              <span className="text-sm text-muted-foreground">QR di esempio per un augurio</span>
            </span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setView("home")}
          className="mt-5 text-sm text-muted-foreground underline"
        >
          ← Torna alla dashboard demo
        </button>
      )}
      {view === "scan" && (
        <>
          <div className="mt-4 flex items-center gap-4 rounded-3xl bg-paper p-4 text-ink">
            <QRCodeSVG
              value={example}
              className="h-24 w-24 shrink-0"
              bgColor="transparent"
              fgColor="currentColor"
              aria-label="QR di esempio"
            />
            <div className="min-w-0 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest">
                QR di esempio · telefono del donatore
              </p>
              <p className="mt-1 font-mono tracking-wider" data-testid="demo-code">
                {formatCode(example)}
              </p>
              <button
                type="button"
                onClick={() => setExample(api.newRequest())}
                className="mt-2 text-xs underline"
              >
                Genera un'altra richiesta di esempio
              </button>
            </div>
          </div>
          <ScanFlow key={`${run}-${example}`} api={api} demo onScanDemo={() => example} />
        </>
      )}
      {view === "manual" && <ManualFlow key={run} api={api} demo />}
      {view === "wish" && (
        <WishTokenDesk key={run} create={async () => wishApi.newCode()} api={wishApi} demo />
      )}
      <div className="glass mt-6 rounded-3xl p-5" data-testid="demo-summary">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl">Riepilogo demo</p>
          <button
            onClick={() => {
              setLog([]);
              setExample(DEMO_CODE);
              setRun((r) => r + 1);
            }}
            className="inline-flex items-center gap-1 text-xs underline"
          >
            <RotateCcw className="h-3 w-3" /> Azzera
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {log.length} palline simulate · totale simulato {euro(total)}
        </p>
        <ul className="mt-3 space-y-2">
          {log.map((e, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <OrnamentIcon kind={e.kind as OrnamentKind} className="w-7 shrink-0" />
              <span className="min-w-0 flex-1">
                {projectForKind(e.kind)?.title} · {euro(e.amount_cents)} ·{" "}
                {e.source === "qr" ? "da QR" : "manuale"} ·{" "}
                {DESK_METHOD_LABEL[e.method].toLowerCase()}
                {e.status === "pending" ? " · dedica in moderazione" : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
