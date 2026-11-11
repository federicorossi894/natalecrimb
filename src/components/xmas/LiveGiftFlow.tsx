import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Gift, HeartHandshake, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/data";
import { CAMPAIGN, campaignPaymentMethods, type OnlineProvider } from "@/lib/campaign";
import { startDonationCheckout } from "@/lib/payments.functions";
import { newDonationAccess, saveDonationAccess } from "@/lib/payment-device";
import { clientId } from "@/lib/tree-store";
import { onlineDedication, saveGiftSession } from "@/lib/online-gift-session";
import { resolvePublicTreeChoice } from "@/lib/public-tree-choice";

/** Uses the same personal/public dedication contract as the DEMO. Never creates
 * an ornament or sends a gift before the payment provider has verified funds.
 */
export function LiveGiftFlow({ project, amount, onBack }: { project: Project; amount: number; onBack: () => void }) {
  const start = useServerFn(startDonationCheckout);
  const access = useRef<ReturnType<typeof newDonationAccess> | null>(null);
  const busy = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [gift, setGift] = useState(true);
  const [to, setTo] = useState(""), [from, setFrom] = useState(""), [msg, setMsg] = useState("");
  const [consent, setConsent] = useState(false), [same, setSame] = useState(true);
  const [dedica, setDedica] = useState(""), [firma, setFirma] = useState("");
  const [provider, setProvider] = useState<OnlineProvider>("sumup");
  const providers = campaignPaymentMethods().filter((p): p is OnlineProvider => p !== "cash");
  const go = async () => {
    if (busy.current || !CAMPAIGN.livePayments) return;
    const publicFields = resolvePublicTreeChoice({
      gift, reusePersonalText: same, personalMessage: msg, personalSignature: from,
      treeMessage: dedica, treeSignature: firma, publishOnTree: consent,
    });
    const valid = onlineDedication.safeParse(publicFields);
    if (!valid.success) { setError(valid.error.issues[0]?.message ?? "Controlla i dati."); return; }
    if (!providers.includes(provider)) { setError("Metodo di pagamento non disponibile."); return; }
    busy.current = true; setSending(true); setError("");
    try {
      const identity = access.current ??= newDonationAccess();
      // Persist only on the originating device, before leaving for an external checkout.
      saveDonationAccess(identity);
      saveGiftSession({
        project: project.id, amount, request: identity.id, client: clientId(),
        id: null, kind: project.ornament, gift, to: gift ? to.trim() : "",
        from: gift ? from.trim() : "", msg: gift ? msg.trim() : "",
        dedica: valid.data.dedica, firma: valid.data.firma, consent: valid.data.consent,
        provider, reusePublicText: same,
      });
      const checkout = await start({ data: {
        requestId: identity.id, accessToken: identity.accessToken, kind: project.ornament,
        amount, provider, donorConfirmation: { requested: false },
      } });
      window.location.assign(checkout.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout non disponibile. Non effettuare un nuovo pagamento.");
      busy.current = false; setSending(false);
    }
  };
  return <section className="mx-auto max-w-xl px-4 py-10">
    <Button variant="ghost" onClick={onBack} disabled={sending}><ArrowLeft />Indietro</Button>
    <h1 className="mt-4 font-display text-3xl">A chi vuoi dedicare il tuo dono?</h1>
    <p className="mt-2 text-gold">{project.title} · {amount} €</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-2" role="group" aria-label="A chi destinare il dono">
      <button type="button" aria-pressed={gift} disabled={sending} onClick={()=>setGift(true)} className={`rounded-2xl border p-5 text-left ${gift ? "border-gold bg-secondary shadow-deep" : "border-border bg-card"}`}>
        <Gift className="h-6 w-6 text-gold" aria-hidden />
        <span className="mt-2 block font-display text-xl">Regalo a una persona</span>
        <span className="mt-1 block text-sm text-muted-foreground">Cartolina privata via WhatsApp o email.</span>
      </button>
      <button type="button" aria-pressed={!gift} disabled={sending} onClick={()=>setGift(false)} className={`rounded-2xl border p-5 text-left ${!gift ? "border-gold bg-secondary shadow-deep" : "border-border bg-card"}`}>
        <HeartHandshake className="h-6 w-6 text-gold" aria-hidden />
        <span className="mt-2 block font-display text-xl">Regalo a Monza</span>
        <span className="mt-1 block text-sm text-muted-foreground">Un dono senza destinatario privato.</span>
      </button>
    </div>
    {gift && <div className="mt-5 space-y-4 rounded-2xl border border-gold/30 bg-secondary/35 p-5">
      <h2 className="font-display text-2xl">Il messaggio per chi ami</h2>
      <label className="block text-sm">Per chi è il regalo? (facoltativo)<input aria-label="Destinatario" maxLength={40} value={to} onChange={e=>setTo(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3" disabled={sending}/></label>
      <label className="block text-sm">Come vuoi firmarti? (facoltativo)<input aria-label="Mittente" maxLength={40} value={from} onChange={e=>setFrom(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3" disabled={sending}/></label>
      <label className="block text-sm">Dedica personale (facoltativa)<textarea aria-label="Messaggio privato" rows={3} maxLength={90} value={msg} onChange={e=>setMsg(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3" disabled={sending}/></label>
    </div>}
    <fieldset className="mt-6 space-y-4 rounded-2xl border border-gold/40 p-5" disabled={sending}>
      <legend className="px-2 font-display text-xl">La tua pallina sull'Albero di Monza</legend>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" aria-label="Pubblica dedica e firma sull’albero" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4"/><span>Pubblica dedica e/o firma sull'albero. <span className="block text-xs text-muted-foreground">Scelta facoltativa: senza la spunta la pallina sarà anonima.</span></span></label>
      {gift && consent && <label className="flex items-start gap-3 text-sm"><input type="checkbox" aria-label="Usa la stessa dedica e firma del regalo" checked={same} onChange={e=>setSame(e.target.checked)} className="mt-1 h-4 w-4"/>Usa la stessa dedica e firma del regalo anche sull'albero.</label>}
      {consent && gift && same && <p role="status" className="rounded-xl bg-secondary p-3 text-xs">Sull'albero saranno pubblici: {msg.trim() ? `«${msg.trim()}»` : "nessuna dedica"}{from.trim() ? ` — ${from.trim()}` : ""}.</p>}
      {consent && (!gift || !same) && <>
        <label className="block text-sm">Dedica pubblica (facoltativa)<textarea aria-label="Dedica pubblica sull’albero" rows={3} maxLength={90} value={dedica} onChange={e=>setDedica(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
        <label className="block text-sm">Firma pubblica (facoltativa)<input aria-label="Firma pubblica" maxLength={40} value={firma} onChange={e=>setFirma(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
      </>}
      <p className="text-xs text-muted-foreground">Non inserire nella parte pubblica informazioni personali di altre persone. Le dediche possono essere sottoposte a moderazione.</p>
    </fieldset>
    <p className="mt-4 text-xs text-muted-foreground">I dati del regalo sono trattati secondo le <Link to="/privacy" className="underline text-gold">informazioni sulla privacy</Link>.</p>
    <h2 className="mt-7 font-display text-xl">Scegli come donare</h2>
    <div className="mt-3 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Metodo di pagamento">{providers.map(p=><Button key={p} role="radio" aria-checked={provider===p} variant={provider===p?"default":"outline"} disabled={sending} onClick={()=>setProvider(p)}>{p==="sumup"?"SumUp":"PayPal"}</Button>)}</div>
    <p className="mt-4 text-xs text-muted-foreground">Dopo il pagamento confermato ritroverai la tua pallina e potrai inviare il regalo e condividere il tuo gesto.</p>
    <Button className="mt-5 h-auto w-full py-4" disabled={sending || !CAMPAIGN.livePayments || providers.length===0} onClick={()=>void go()}>{sending?"Apro il pagamento…":`Procedi alla donazione di ${amount} €`}</Button>
    {error && <p role="alert" className="mt-4 text-sm text-primary">{error}</p>}
    {!CAMPAIGN.livePayments && <p role="status" className="mt-3 text-xs text-gold">Pagamenti reali non ancora attivati: il percorso è pronto per il collaudo finale.</p>}
  </section>;
}
