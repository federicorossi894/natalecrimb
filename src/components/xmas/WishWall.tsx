import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock, Copy, PenLine, QrCode, RotateCcw, ShieldCheck } from "lucide-react";
import { Modal } from "./Modal";
import { formatCode } from "@/lib/cash";
import {
  NICK_MAX, WISH_MAX, WISH_TOKEN_DAYS, contactHints, noteLook, wishSchema, wishUrl,
  type PublicWish, type WishApi, type WishLookup,
} from "@/lib/wishes";
import { cn } from "@/lib/utils";

/** One paper note held by a wooden clothespin. */
export function PaperNote({ wish, onOpen, className, style, big = false }: { wish: PublicWish; onOpen?: () => void; className?: string; style?: CSSProperties; big?: boolean }) {
  const look = noteLook(wish.id);
  const content = (
    <>
      <span className="wish-pin" style={{ transform: `translateX(-50%) rotate(${look.pin}deg)` }} aria-hidden />
      {wish.demo && <span className="wish-demo-stamp">Esempio · DEMO</span>}
      <span className={cn("wish-text block", big ? "text-[1.7rem] leading-snug" : "line-clamp-6 text-[1.15rem] leading-[1.25]")}>{wish.body}</span>
      <span className={cn("mt-2 block text-right font-semibold", big ? "text-base" : "text-[0.78rem]")}>— {wish.nickname ?? "Un augurio da Monza"}</span>
    </>
  );
  const cls = cn("wish-note", `wish-paper-${look.paper}`, className);
  const st: CSSProperties = { ...style, ["--tilt" as string]: `${big ? 0 : look.rotate}deg`, ["--lift" as string]: `${big ? 0 : look.lift}px` };
  if (!onOpen) return <div className={cls} style={st}>{content}</div>;
  return (
    <button type="button" onClick={onOpen} className={cls} style={st} aria-label={`Leggi l'augurio${wish.nickname ? ` di ${wish.nickname}` : ""}${wish.demo ? " (esempio demo)" : ""}`}>
      {content}
    </button>
  );
}

/** Wooden wall with twine rows; notes overlap slightly like the real thing and fill in progressively. */
export function WishWall({ wishes }: { wishes: PublicWish[] }) {
  const [open, setOpen] = useState<PublicWish | null>(null);
  return (
    <>
      <div className="wish-wall" data-testid="wish-wall">
        <ul className="wish-grid">
          {wishes.map((w, i) => (
            <li key={w.id} className="wish-cell" style={{ ["--i" as string]: Math.min(i, 24) }}>
              <PaperNote wish={w} onOpen={() => setOpen(w)} />
            </li>
          ))}
        </ul>
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)}>
        {open && (
          <div className="pt-6">
            <PaperNote wish={open} big className="mx-auto max-w-sm" />
            <p className="mt-5 text-center text-xs text-muted-foreground">
              {open.demo ? "Biglietto di esempio per la demo: non è un augurio vero." : "Augurio letto e approvato dallo staff della casetta prima della pubblicazione."}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}

const STATUS_TEXT: Record<string, { t: string; d: string }> = {
  pending: { t: "In attesa di lettura", d: "Lo staff della casetta legge ogni augurio prima di appenderlo al muro. Di solito serve poco tempo." },
  approved: { t: "Appeso al Muro degli auguri", d: "Il tuo biglietto è sul muro e può comparire sullo schermo della casetta." },
  rejected: { t: "Non pubblicato", d: "Questo augurio non è stato appeso, per esempio perché conteneva dati personali o link. Grazie comunque per il pensiero." },
  hidden: { t: "Non più visibile", d: "Il biglietto è stato tolto dal muro dallo staff." },
};

/** Personal page of a one-time code: write once, then come back with the same link to see the status. */
export function WishWriter({ code, api, demo = false, onDone }: { code: string; api: WishApi; demo?: boolean; onDone?: () => void }) {
  const [info, setInfo] = useState<WishLookup | null>(null);
  const [err, setErr] = useState("");
  const [body, setBody] = useState("");
  const [nickname, setNickname] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const load = useCallback(async () => {
    try { setInfo(await api.lookup(code)); } catch (e) { setErr(e instanceof Error ? e.message : "Errore di connessione"); }
  }, [api, code]);
  useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = wishSchema.safeParse({ body, nickname, consent });
    if (!r.success) { setErr(r.error.issues[0]?.message ?? "Controlla il biglietto"); return; }
    setBusy(true); setErr("");
    try {
      const res = await api.submit(code, r.data.body, r.data.nickname, true);
      if (res.result === "expired") setErr("Il codice è scaduto.");
      if (res.result === "not_found") setErr("Codice non valido.");
      await load();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Errore"); }
    finally { setBusy(false); }
  };

  const hints = contactHints(`${body} ${nickname}`);
  const left = WISH_MAX - body.trim().length;
  const link = wishUrl(code);

  if (!info) return <p className="py-10 text-center text-muted-foreground" role="status">{err || "Apro il tuo biglietto…"}</p>;
  if (info.state === "not_found") return <Notice title="Codice non valido" text="Controlla di aver inquadrato il QR consegnato alla casetta, oppure chiedi ai volontari un nuovo codice." />;
  if (info.state === "expired") return <Notice title="Codice scaduto" text={`I codici per gli auguri valgono ${WISH_TOKEN_DAYS} giorni. Passa alla casetta in Piazza San Paolo: i volontari ti aiuteranno.`} />;

  if (info.state === "used") {
    const st = STATUS_TEXT[info.wish_status ?? "pending"] ?? STATUS_TEXT["pending"]!;
    return (
      <div className="space-y-5" data-testid="wish-status">
        {demo && <DemoBand />}
        <PaperNote wish={{ id: code, body: info.body ?? "", nickname: info.nickname }} big className="mx-auto max-w-sm" />
        <div className="glass rounded-2xl p-5" role="status">
          <p className="flex items-center gap-2 font-display text-xl">{info.wish_status === "approved" ? <CheckCircle2 className="h-5 w-5 text-gold" /> : <Clock className="h-5 w-5 text-gold" />}{st.t}</p>
          <p className="mt-1 text-sm text-muted-foreground">{demo ? "Presentazione: nessun biglietto salvato né pubblicato." : st.d}</p>
        </div>
        {!demo && !onDone && (
          <div className="glass rounded-2xl p-5 text-sm">
            <p className="font-semibold">Il tuo link personale</p>
            <p className="mt-1 text-muted-foreground">Conservalo per controllare quando il tuo augurio viene appeso. Non serve altro: nessun account, nessun dato personale.</p>
            <button type="button" onClick={() => { void navigator.clipboard?.writeText(link).then(() => setCopied(true)); }} className="mt-3 inline-flex items-center gap-2 rounded-full border hairline-gold px-4 py-2 text-xs font-semibold text-gold">
              <Copy className="h-4 w-4" /> {copied ? "Link copiato" : "Copia il link"}
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Link to="/auguri" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Vai al Muro degli auguri</Link>
          {onDone && <button type="button" onClick={onDone} className="glass rounded-full px-5 py-3 text-sm font-semibold">Prossimo cliente</button>}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" data-testid="wish-form">
      {demo && <DemoBand />}
      <div className={cn("wish-note wish-paper-ivory wish-editor")} style={{ ["--tilt" as string]: "-1deg" }}>
        <span className="wish-pin" style={{ transform: "translateX(-50%)" }} aria-hidden />
        <label htmlFor="wish-body" className="block text-xs font-semibold uppercase tracking-widest text-ink/60">Il tuo augurio</label>
        <textarea id="wish-body" value={body} maxLength={WISH_MAX + 20} rows={5} onChange={(e) => setBody(e.target.value)} placeholder="Scrivi qui il tuo augurio per Monza…"
          className="wish-text mt-1 block w-full resize-none bg-transparent text-[1.45rem] leading-snug outline-none placeholder:text-ink/40" aria-describedby="wish-count" />
        <p id="wish-count" className={cn("text-right text-xs", left < 0 ? "font-semibold text-primary" : "text-ink/60")}>{left < 0 ? `${-left} caratteri di troppo` : `${left} caratteri disponibili`}</p>
        <label htmlFor="wish-nick" className="mt-2 block text-xs font-semibold uppercase tracking-widest text-ink/60">Firma · soprannome facoltativo</label>
        <input id="wish-nick" value={nickname} maxLength={NICK_MAX} onChange={(e) => setNickname(e.target.value)} placeholder="es. Una famiglia di Monza" autoComplete="off"
          className="wish-text mt-1 w-full border-b border-ink/25 bg-transparent py-1 text-lg outline-none placeholder:text-ink/40" />
      </div>
      {hints.length > 0 && (
        <p className="rounded-2xl border hairline-gold p-3 text-sm text-gold" role="status">Sembra che tu abbia scritto {hints.join(", ")}. Per la tua privacy lo staff non pubblica contatti o link: meglio toglierli.</p>
      )}
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />Non scrivere cognomi, indirizzi, telefoni, email o link. Se sei un bambino o una bambina, fatti aiutare da un adulto.</li>
        <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />Ogni augurio viene letto dallo staff prima di comparire sul muro e sullo schermo della casetta. Non lo usiamo per altri scopi.</li>
      </ul>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErr(""); }} className="mt-1 h-5 w-5 shrink-0 accent-[var(--gold)]" />
        <span>Acconsento a pubblicare questo augurio e il soprannome sul Muro degli auguri del sito e sullo schermo della casetta, dopo la lettura dello staff.</span>
      </label>
      {err && <p role="alert" className="text-sm text-gold">{err}</p>}
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60">
        <PenLine className="h-5 w-5" /> Appendi il mio augurio
      </button>
      <p className="text-center text-xs text-muted-foreground">Un solo augurio per codice · valido fino al {info.expires_at ? new Date(info.expires_at).toLocaleDateString("it-IT", { day: "numeric", month: "long" }) : "—"}</p>
    </form>
  );
}

function DemoBand() {
  return <p className="rounded-2xl border-2 border-dashed hairline-gold px-4 py-3 text-xs font-semibold text-gold">DEMO · Presentazione: il biglietto resta solo su questa pagina, non viene salvato né pubblicato.</p>;
}
function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="glass rounded-3xl p-6 text-center" role="status">
      <p className="font-display text-2xl">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      <Link to="/auguri" className="mt-4 inline-block text-sm font-semibold text-gold underline-offset-4 hover:underline">Guarda il Muro degli auguri</Link>
    </div>
  );
}

/**
 * Volunteer desk, "Acquisto alla casetta": after a real sale, one code for ONE wish. No product, price or
 * customer data is recorded. `create` is the real backend call, or the in-memory one in presentation mode.
 */
export function WishTokenDesk({ create, api, demo = false }: { create: () => Promise<{ code: string; expires_at: string }>; api: WishApi; demo?: boolean }) {
  const [token, setToken] = useState<{ code: string; expires_at: string } | null>(null);
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const reset = () => { setToken(null); setWriting(false); setErr(""); };
  const generate = async () => {
    setBusy(true); setErr("");
    try { setToken(await create()); } catch (e) { setErr(e instanceof Error ? e.message : "Errore"); } finally { setBusy(false); }
  };
  if (!token) {
    return (
      <div className="mt-4 space-y-4" data-testid="wish-desk">
        <div className="glass rounded-2xl p-4 text-sm">
          <p>Dopo una vendita alla casetta, genera <b>un codice per un augurio</b>. Il cliente lo usa subito o da casa entro {WISH_TOKEN_DAYS} giorni.</p>
          <p className="mt-2 text-muted-foreground">Non si registrano prodotti, prezzi né dati del cliente. Non sostituisce la donazione: è un piccolo grazie per l'acquisto.</p>
        </div>
        {err && <p role="alert" className="text-sm text-gold">{err}</p>}
        <button disabled={busy} onClick={generate} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60">
          <QrCode className="h-5 w-5" /> Genera il QR per un augurio
        </button>
      </div>
    );
  }
  if (writing) {
    return (
      <div className="mt-4">
        <button onClick={() => setWriting(false)} className="mb-4 text-sm text-muted-foreground underline">← Torna al QR</button>
        <WishWriter code={token.code} api={api} demo={demo} onDone={reset} />
      </div>
    );
  }
  const url = wishUrl(token.code);
  return (
    <div className="mt-4 space-y-4" data-testid="wish-token">
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-paper p-5 text-ink">
        <p className="text-[11px] font-semibold uppercase tracking-widest">{demo ? "QR di esempio · DEMO" : "Augurio per il cliente · monouso"}</p>
        <QRCodeSVG value={url} level="M" marginSize={2} className="h-56 w-56" aria-label="QR per scrivere un augurio" />
        {!demo && <p className="font-mono text-sm tracking-wider" data-testid="wish-code">{formatCode(token.code)}</p>}
        <p className="text-center text-xs">Valido fino al {new Date(token.expires_at).toLocaleDateString("it-IT", { day: "numeric", month: "long" })} · un solo augurio</p>
      </div>
      <p className="text-center text-sm text-muted-foreground">Il cliente inquadra il QR con il suo telefono, oppure scrive qui sul tablet.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button onClick={() => setWriting(true)} className="flex items-center justify-center gap-2 rounded-full bg-fir py-3.5 font-semibold text-snow"><PenLine className="h-4 w-4" /> Scrivi ora su questo dispositivo</button>
        <button onClick={reset} className="glass flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold"><RotateCcw className="h-4 w-4" /> Nuovo acquisto</button>
      </div>
    </div>
  );
}
