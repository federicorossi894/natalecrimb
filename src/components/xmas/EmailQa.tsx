import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MailCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { testDemoEmail, sendDemoEmail } from "@/lib/gift-email.functions";

export function EmailQa() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [approved, setApproved] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [kind, setKind] = useState<"receipt" | "gift_now" | "christmas_simulation">("receipt");
  const checkFn = useServerFn(testDemoEmail);
  const sendFn = useServerFn(sendDemoEmail);
  async function check() {
    setBusy(true);
    try { const r = await checkFn({ data: {} }); setReady(r.ready); setStatus(r.ready ? "Gmail e registro disponibili. Nessuna email inviata." : "Non pronto: collegare Gmail con l’account QA corretto e verificare il registro delle prove."); }
    catch { setReady(false); setStatus("Verifica non disponibile o accesso non autorizzato. Nessuna email inviata."); }
    finally { setBusy(false); }
  }
  async function send() {
    if (!approved || !ready || busy) return;
    const id = requestId ?? crypto.randomUUID(); setRequestId(id); setBusy(true);
    try {
      const r = await sendFn({ data: { kind, requestId: id, approved: true } });
      setStatus(r.state === "accepted" ? "Accettata da Gmail, non ancora confermata come consegnata. Controlla la casella QA, anche spam." : r.state === "rate_limited" ? "Prova già richiesta o limite raggiunto: almeno 10 minuti fra prove, massimo 3 al giorno." : r.state === "unknown" ? "Esito incerto: non ripetere. Controlla la casella e il registro." : r.state === "failed" ? "Gmail non ha accettato la prova. Verificare connessione e registro prima di una nuova prova." : "Invio non disponibile. Nessuna email inviata.");
    } catch (e) { setStatus(e instanceof Error ? e.message : "Esito non verificato: non ripetere la prova."); }
    finally { setApproved(false); setBusy(false); }
  }
  return <section className="mt-8 border-t py-6">
    <h2 className="font-display text-2xl">Prova email · DEMO</h2>
    <p className="mt-2 break-words text-sm">Da e a: federico.rossi@crimonza.org</p>
    <p className="mt-2 text-sm text-muted-foreground">[DEMO — NESSUN PAGAMENTO] · Non valida come ricevuta. Tutte le prove partono subito, nessun invio programmato per Natale.</p>
    <label className="mt-4 block text-sm" htmlFor="qa-kind">Tipo di prova</label>
    <select id="qa-kind" value={kind} disabled={busy} className="mt-2 w-full rounded-md border bg-background p-3 text-foreground" onChange={e => { const v = e.target.value; if (v === "receipt" || v === "gift_now" || v === "christmas_simulation") { setKind(v); setRequestId(null); setApproved(false); } }}>
      <option value="receipt">Conferma informativa donazione DEMO</option><option value="gift_now">Augurio immediato</option><option value="christmas_simulation">Natale · SIMULAZIONE ORARIO, inviata subito</option>
    </select>
    <div className="mt-4 flex items-start gap-3"><Checkbox id="qa-approve" checked={approved} disabled={!ready || busy} onCheckedChange={v => setApproved(v === true)} /><label htmlFor="qa-approve" className="text-sm">Autorizzo questa email reale solo alla mia casella QA.</label></div>
    <div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={check}><MailCheck />Verifica Gmail</Button><Button disabled={!ready || !approved || busy} onClick={send}><Send />Invia prova al QA</Button></div>
    <p className="mt-3 text-sm text-muted-foreground">Una prova ogni 10 minuti, massimo tre al giorno. L’esito Gmail attesta l’accettazione, non la consegna.</p>
    {!ready && <a className="mt-3 inline-block break-all text-sm underline" href="https://lovable.dev/dashboard?connectors=&connector=google_mail&workspace=FqetqUBRBhlbcaE0ZRZ4" target="_blank" rel="noreferrer">Collega o controlla Gmail in Lovable</a>}
    {status && <p role="status" className="mt-3 text-sm text-gold">{status}</p>}
  </section>;
}
