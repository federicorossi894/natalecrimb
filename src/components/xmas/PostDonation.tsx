import { ONLINE_GIFT } from "@/lib/site-experience";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, CheckCheck, Copy, Download, ExternalLink, Home, LocateFixed, MapPin, MessageCircle, Printer, Send, X } from "lucide-react";
import { OrnamentIcon } from "./Ornament";
import { DemoNotice } from "./Modal";
import { TREE_UNTIL, type Project } from "@/lib/data";
import { INVITE_LINE, postcardText, renderPostcardImage } from "@/lib/postcard-share";
import { CHRISTMAS_DELIVERY, MODE_LABEL, confirmationText, giftEmailSchema, type EmailAudience, type EmailMode } from "@/lib/email-demo";
import { emailSubject, giftEmailHtml } from "@/lib/email-template";
import { CAMPAIGN } from "@/lib/campaign";
import { Button } from '@/components/ui/button';

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

/** Exports an on-screen preview as PNG (for slides / PowerPoint). */
export async function exportNode(node: HTMLElement | null, name: string) {
  if (!node) return;
  const { toBlob } = await import("html-to-image");
  // Freeze entrance/float animations so the capture shows the final frame, not the invisible first one.
  node.classList.add("is-exporting");
  try {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    // No cacheBust: it appends ?timestamp to blob: image URLs (the postcard), which then fail to load.
    // margin 0: centred previews (mx-auto) would otherwise be shifted inside the exported image.
    const blob = await toBlob(node, { pixelRatio: 2, width: node.offsetWidth, height: node.offsetHeight, style: { margin: "0" } });
    if (blob) downloadBlob(blob, name);
  } finally {
    node.classList.remove("is-exporting");
  }
}

/** Invitation shown at the end of every post-donation path. */
export function PiazzaInvite() {
  if (ONLINE_GIFT) return null;
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border hairline-gold p-4 text-left">
      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
      <p className="text-sm"><strong className="font-display text-base">Vieni a vedere il tuo addobbo.</strong><br /><span className="text-muted-foreground">È sull'albero digitale, sullo schermo della casetta CRI in Piazza San Paolo, fino al {TREE_UNTIL}. Non è un oggetto fisico: è il segno luminoso del tuo dono.</span></p>
    </div>
  );
}

/** End state of "È il mio regalo a Monza": short, warm, done. */
export function CityThanks({ project, note, ornamentId, demo = false }: { project: Project; note?: ReactNode; ornamentId?: string | null; demo?: boolean }) {
  return (
    <section className="animate-rise mx-auto max-w-lg px-4 pt-8 text-center" data-testid="city-thanks">
      <div className="relative mx-auto w-28">
        <div className="absolute inset-0 rounded-full bg-gold/40 blur-2xl" />
        <OrnamentIcon kind={project.ornament} className="animate-floaty relative w-28" />
      </div>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">Il tuo regalo a Monza{demo ? " · esempio" : ""}</p>
      <h1 className="mt-2 font-display text-4xl leading-tight">Grazie. <span className="text-gold">Monza è un po' più calda.</span></h1>
      <p className="mt-3 text-muted-foreground">Il tuo addobbo “{project.title}” brilla sull'Albero di Monza.</p>
      {note && <p className="mt-2 text-xs text-gold">{note}</p>}
      <div className="mt-6 grid gap-2">
        {demo ? (
          <span className="flex items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-primary-foreground"><LocateFixed className="h-4 w-4" /> Trova il mio addobbo</span>
        ) : (
          <Link to="/albero" search={ornamentId ? { addobbo: ornamentId } : { trova: 1 }} className="flex items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-primary-foreground"><LocateFixed className="h-4 w-4" /> Trova il mio addobbo</Link>
        )}
        {!demo && <Link to="/" className="glass flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"><Home className="h-4 w-4" /> Torna alla home</Link>}
      </div>
      <PiazzaInvite />
      {CAMPAIGN.demo && <p className="mt-4 text-[11px] text-muted-foreground">Donazione simulata · nessun importo reale</p>}
    </section>
  );
}

/** Illustrative WhatsApp chat (dark theme), so the shared message can be shown and exported. */
export function WhatsAppMock({ contact, imageUrl, text, refEl }: { contact: string; imageUrl: string | null; text: string; refEl?: React.Ref<HTMLDivElement> }) {
  const time = "18:42";
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <div ref={refEl} className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border-4 border-ink shadow-deep" data-testid="whatsapp-mock">
      <div className="wa-header flex items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-display text-lg text-ink">{(contact.trim()[0] ?? "?").toUpperCase()}</span>
        <div className="min-w-0 leading-tight"><p className="truncate font-semibold">{contact.trim() || "Destinatario"}</p><p className="wa-meta text-[11px]">online</p></div>
        {CAMPAIGN.demo && <span className="ml-auto rounded-full border border-current px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest opacity-70">Demo</span>}
      </div>
      <div className="wa-chat px-3 py-4">
        <div className="wa-bubble ml-auto max-w-[88%] p-1.5 text-[13px] leading-snug">
          {imageUrl ? <img src={imageUrl} alt="Cartolina condivisa" className="w-full rounded-lg" /> : <div className="aspect-[4/5] w-full animate-pulse rounded-lg bg-ink/30" />}
          <p className="whitespace-pre-line px-1.5 pb-1 pt-2">{parts.map((s, i) => (/^https?:\/\//.test(s) ? <span key={i} className="wa-link underline">{s}</span> : <span key={i}>{s}</span>))}</p>
          <p className="wa-meta flex items-center justify-end gap-1 px-1.5 text-[10px]">{time} <CheckCheck className="wa-tick h-3.5 w-3.5" /></p>
        </div>
      </div>
    </div>
  );
}

/** Postcard image + WhatsApp preview with share/export actions. */
export function PostcardStudio({ project, to, from, msg, ornamentId, demo = false, status, selfThanks = false }: { project: Project; to: string; from: string; msg: string; ornamentId?: string | null; demo?: boolean; status?: ReactNode; selfThanks?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [renderError, setRenderError] = useState(false);
  const [retry, setRetry] = useState(0);
  const chat = useRef<HTMLDivElement>(null);
  const text = useMemo(() => postcardText(project, to, from, msg, ornamentId, selfThanks), [project, to, from, msg, ornamentId, selfThanks]);
  useEffect(() => {
    let on = true, made: string | null = null;
    setFile(null); setUrl(null); setRenderError(false);
    const timer = setTimeout(() => { if(on) { on=false; setRenderError(true); } }, 15000);
    renderPostcardImage(project, to, from, msg, ornamentId, selfThanks).then((f) => {
      if (!on) return;
      if (!f) throw new Error('PNG unavailable');
      clearTimeout(timer);
      made = URL.createObjectURL(f); setFile(f); setUrl(made);
    }).catch(() => { clearTimeout(timer); if(on) setRenderError(true); });
    return () => { on = false; clearTimeout(timer); if (made) URL.revokeObjectURL(made); };
  }, [project, to, from, msg, ornamentId, selfThanks, retry]);
  const share = async () => {
    if (file && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: CAMPAIGN.demo ? "Cartolina CRI Monza · demo" : "Cartolina CRI Monza", text }); setNote("Scegli WhatsApp dal menu di condivisione: il messaggio parte solo quando premi invio."); return; }
      catch (e) { if (e instanceof Error && e.name === "AbortError") return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setNote("Si apre WhatsApp con il messaggio già scritto: scegli tu il contatto e premi invio. La cartolina va allegata a parte, dopo averla scaricata.");
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text); setNote("Messaggio copiato."); } catch { setNote("Copia non disponibile su questo dispositivo."); } };
  return (
    <div data-testid="postcard-studio">
      {status && <p className="mb-4 text-center text-xs text-gold">{status}</p>}
      <div className="grid items-start gap-8 md:grid-cols-2">
        <figure>
          <figcaption className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gold">La cartolina · immagine</figcaption>
          {url ? <img src={url} alt={`Cartolina ${project.title} per ${to || 'il tuo gesto solidale'}`} className="w-full rounded-2xl shadow-deep" data-testid="postcard-image" /> : renderError ? <div className="flex aspect-[4/5] flex-col items-center justify-center gap-4 border p-5 text-center"><p role="alert">La cartolina non è stata generata. Puoi riprovare o condividere il testo con il link.</p><Button variant="outline" onClick={()=>setRetry(n=>n+1)}>Riprova cartolina</Button></div> : <div role="status" className="glass flex aspect-[4/5] w-full items-center justify-center animate-pulse rounded-2xl">Preparo la cartolina…</div>}
        </figure>
        <figure>
          <figcaption className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gold">Anteprima del messaggio WhatsApp</figcaption>
          <WhatsAppMock refEl={chat} contact={to} imageUrl={url} text={text} />
        </figure>
      </div>
      <div className="mx-auto mt-6 max-w-lg space-y-2">
        <Button onClick={share} aria-describedby="wa-how" className="h-auto w-full py-4 shadow-deep"><MessageCircle className="h-5 w-5" /> {ONLINE_GIFT ? "Condividi su WhatsApp" : "Apri WhatsApp con il messaggio"}</Button>
        <p id="wa-how" className="text-center text-xs text-muted-foreground" data-testid="wa-how">Sul telefono, se supportato, scegli WhatsApp per condividere il PNG e il testo. Altrimenti si apre il testo con il link: scarica la cartolina e allegala a parte. Nulla parte automaticamente.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => file && downloadBlob(file, file.name)} disabled={!file} className="h-auto whitespace-normal py-3 text-sm"><Download className="h-4 w-4" /> Scarica cartolina</Button>
          <button onClick={() => void exportNode(chat.current, `anteprima-whatsapp-${project.id}.png`)} className="glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"><Download className="h-4 w-4" /> Scarica anteprima</button>
          <button onClick={copy} className="glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"><Copy className="h-4 w-4" /> Copia messaggio</button>
          {demo ? <span className="glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold opacity-80"><LocateFixed className="h-4 w-4" /> Trova l'addobbo</span>
            : <Link to="/albero" search={ornamentId ? { addobbo: ornamentId } : { trova: 1 }} className="glass inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"><LocateFixed className="h-4 w-4" /> Trova l'addobbo</Link>}
        </div>
        {note && <p role="status" className="text-center text-xs text-muted-foreground">{note}</p>}
        <PiazzaInvite />
        <p className="text-center text-[11px] text-muted-foreground">{CAMPAIGN.demo && "Cartolina DEMO: il messaggio lo dichiara. "}Il nome del destinatario non viene salvato.</p>
      </div>
    </div>
  );
}

/** Live preview of the HTML email in a sandboxed iframe that grows with its content. */
export function EmailFrame({ html, title = "Anteprima email" }: { html: string; title?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState(900);
  const fit = () => { const d = ref.current?.contentDocument; if (d?.body) setH(Math.max(600, d.documentElement.scrollHeight)); };
  return <iframe ref={ref} title={title} srcDoc={html} onLoad={fit} sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" className="w-full rounded-2xl border hairline-gold bg-ivory" style={{ height: h }} data-testid="email-frame" />;
}

export function emailActions(html: string, name: string) {
  const blob = () => new Blob([html], { type: "text/html" });
  return {
    open: () => { const u = URL.createObjectURL(blob()); window.open(u, "_blank", "noopener"); setTimeout(() => URL.revokeObjectURL(u), 60_000); },
    download: () => downloadBlob(blob(), name),
    print: () => {
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.open(); w.document.write(html); w.document.close();
      w.onload = () => w.print();
      setTimeout(() => w.print(), 800);
    },
  };
}

export function EmailExportBar({ html, name }: { html: string; name: string }) {
  const a = emailActions(html, name);
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
      <button type="button" onClick={a.open} className="glass inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 font-semibold"><ExternalLink className="h-4 w-4" /> Apri</button>
      <button type="button" onClick={a.download} className="glass inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 font-semibold"><Download className="h-4 w-4" /> HTML</button>
      <button type="button" onClick={a.print} className="glass inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 font-semibold"><Printer className="h-4 w-4" /> PDF</button>
    </div>
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

export type EmailStudioDefaults = { donor?: string; toName?: string; to?: string; msg?: string; mode?: EmailMode };

/**
 * Compose + preview + export of the gift email. `onConfirm` may hang the ornament first and return its id.
 * Nothing is sent or scheduled; the address is cleared right after the simulated confirmation.
 */
export function EmailStudio({ project, audience = "recipient", ornamentId, defaults, demo = false, consentSlot, onConfirm, title, subtitle }: {
  project: Project; audience?: EmailAudience; ornamentId?: string | null; defaults?: EmailStudioDefaults; demo?: boolean;
  consentSlot?: ReactNode; onConfirm?: (d: { donor: string; msg: string }) => Promise<string | null | void>; title?: string; subtitle?: string;
}) {
  const [mode, setMode] = useState<EmailMode>(defaults?.mode ?? "christmas");
  const [donor, setDonor] = useState(defaults?.donor ?? "");
  const [toName, setToName] = useState(defaults?.toName ?? "");
  const [to, setTo] = useState(defaults?.to ?? "");
  const [msg, setMsg] = useState(defaults?.msg ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkId, setLinkId] = useState<string | null>(ornamentId ?? null);
  const [done, setDone] = useState<EmailMode | null>(null);
  useEffect(() => { if (ornamentId) setLinkId(ornamentId); }, [ornamentId]);
  const effMode: EmailMode = audience === "donor" ? "now" : mode;
  const [html, setHtml] = useState("");
  useEffect(() => {
    setHtml(giftEmailHtml({ project, audience, mode: effMode, donor, toName, toEmail: to, msg, ornamentId: linkId, envelope: true }));
  }, [project, audience, effMode, donor, toName, to, msg, linkId]);
  const confirm = async () => {
    if (!CAMPAIGN.emailSimulator) { setError("Invio non disponibile: il mittente e il servizio email non sono ancora configurati. Nessuna email inviata o programmata."); return; }
    const r = giftEmailSchema.safeParse({ mode: effMode, donor, toName, to, msg });
    if (!r.success) { setError(r.error.issues[0]?.message ?? "Dati non validi"); return; }
    setError(""); setBusy(true);
    try { const id = await onConfirm?.({ donor: r.data.donor, msg: r.data.msg }); if (id) setLinkId(id); }
    catch (e) { setError(e instanceof Error ? e.message : "Errore, riprova"); setBusy(false); return; }
    setBusy(false);
    setDone(effMode);
    if (!demo) setTo(""); // nothing is kept
  };
  const modes: { id: EmailMode; d: string; i: ReactNode }[] = [
    { id: "now", d: "Arriva subito", i: <Send className="h-5 w-5" /> },
    { id: "christmas", d: CHRISTMAS_DELIVERY, i: <CalendarClock className="h-5 w-5" /> },
  ];
  return (
    <div data-testid="email-studio">
      {title && <h1 className="font-display text-4xl">{title}</h1>}
      {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          {audience === "recipient" && (
            <div role="radiogroup" aria-label="Quando inviare l'email" className="grid grid-cols-2 gap-3">
              {modes.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${mode === m.id ? "border-gold bg-secondary" : "glass"}`}>
                  <span className={mode === m.id ? "text-gold" : "text-muted-foreground"}>{m.i}</span>
                  <span className="font-display text-lg leading-tight">{MODE_LABEL[m.id]}</span>
                  <span className="text-xs text-muted-foreground">{m.d}</span>
                </button>
              ))}
            </div>
          )}
          <Field label={audience === "donor" ? "Nome del donatore (facoltativo)" : "Il tuo nome (facoltativo)"} placeholder="Es. Federico" maxLength={40} value={donor} onChange={(e) => setDonor(e.target.value)} />
          {audience === "recipient" && <Field label="Nome del destinatario (facoltativo)" placeholder="Es. Giulia" maxLength={40} value={toName} onChange={(e) => setToName(e.target.value)} />}
          <Field label={audience === "donor" ? "Email del donatore" : "Email del destinatario"} type="email" autoComplete="off" placeholder="nome@esempio.it" maxLength={255} value={to} onChange={(e) => setTo(e.target.value)} />
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dedica (facoltativa)</span>
            <textarea rows={3} maxLength={90} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={project.postcardLine} className="glass mt-1.5 w-full rounded-2xl p-4 outline-none focus:border-gold" />
          </label>
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setMsg(project.postcardLine)} className="rounded-full border hairline-gold px-3 py-1.5 text-xs text-gold">Usa la frase suggerita</button>
            <span className="text-[11px] text-muted-foreground">{msg.length}/90</span>
          </div>
          {consentSlot}
          {error && <p role="alert" className="text-sm text-gold">{error}</p>}
          <Button disabled={busy || !CAMPAIGN.emailSimulator} onClick={confirm} className="h-auto w-full rounded-full py-4 font-semibold disabled:opacity-60">
            {!CAMPAIGN.emailSimulator ? "Invio email non ancora disponibile" : busy ? "Un attimo…" : audience === "donor" ? "Invia cartolina al donatore (demo)" : effMode === "now" ? "Invia ora (demo)" : "Invia a Natale (demo)"}
          </Button>
          <p className="text-xs text-muted-foreground">Email regalo distinta dalla conferma della donazione. In questa DEMO non parte alcun messaggio reale, nemmeno a terzi.</p>
          <p className="text-center text-[11px] text-muted-foreground">{CAMPAIGN.emailSimulator ? "Demo: nessuna email viene inviata o programmata, nessun indirizzo viene salvato." : "Invio email in attivazione: nessuna email inviata o programmata. Il mittente non è ancora configurato."}</p>
          {done && <SentNotice key={done} text={audience === "donor" ? "Invio simulato: la cartolina partirebbe ora verso il donatore." : confirmationText(done)} onClose={() => setDone(null)} />}
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gold">Anteprima email · {emailSubject({ audience, donor, toName })}</p>
          {html ? <EmailFrame html={html} /> : <div className="glass h-[900px] animate-pulse rounded-2xl" />}
          {html && <EmailExportBar html={html} name={`email-cri-monza-${project.id}.html`} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline (non-blocking) confirmation of the simulated send. It replaced a full-screen overlay that swallowed the
 * first tap on header links and "back to dashboard" buttons, leaving the email form on screen.
 */
function SentNotice({ text, onClose }: { text: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: "center", behavior: "smooth" }); ref.current?.focus(); }, []);
  return (
    <div ref={ref} tabIndex={-1} role="status" className="relative rounded-3xl border hairline-gold bg-secondary p-5 text-center outline-none" data-testid="email-sent">
      <button type="button" onClick={onClose} aria-label="Chiudi conferma" className="absolute right-2 top-2 rounded-full p-2 text-muted-foreground hover:bg-background/40"><X className="h-4 w-4" /></button>
      <DemoNotice>{text} 🎄</DemoNotice>
      <p className="mt-3 text-sm text-muted-foreground">Simulazione: nessuna email inviata né programmata, l'indirizzo non è stato salvato.</p>
      <p className="mt-3 text-xs text-gold">{INVITE_LINE}</p>
    </div>
  );
}
