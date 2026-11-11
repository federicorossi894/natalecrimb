import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MessageCircle, Sparkles } from "lucide-react";
import type { Project } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { updatePaidDedication } from "@/lib/payments.functions";
import { requestPaidGiftEmail, requestPaidDonorReceipt } from "@/lib/gift-email.functions";
import { loadDonationAccess } from "@/lib/payment-device";
import { loadGiftSession, saveGiftSession } from "@/lib/online-gift-session";
import { PostcardStudio } from "./PostDonation";
import { TreeExperience } from "./TreeExperience";
import { SolidarityShare } from "./SolidarityShare";

function LiveRecipientEmail({donationId,project,from,toName,msg,onAccepted}:{donationId:string;project:Project;from:string;toName:string;msg:string;onAccepted:()=>void}) {
  const send=useServerFn(requestPaidGiftEmail);
  const [to,setTo]=useState(""),[when,setWhen]=useState<"now"|"christmas">("now");
  const [expected,setExpected]=useState(false),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[note,setNote]=useState(""),[error,setError]=useState("");
  const submit=async()=>{
    const access=loadDonationAccess(donationId);
    if(!access || busy || done)return;
    if(!expected){setError("Conferma di poter usare questo indirizzo email per il regalo.");return;}
    setBusy(true);setError("");
    try {
      const response=await send({data:{...access,gift:{mode:when,to,donor:from,toName,msg,recipientExpected:true}}});
      if(response.state==="scheduled"){
        setDone(true);setNote("Regalo registrato per l'invio a partire dalle 00:05 del 25 dicembre (ora italiana).");onAccepted();
      } else if(response.state==="accepted"){
        setDone(true);setNote("Email accettata da Gmail. La consegna al destinatario dipende dal suo servizio di posta.");onAccepted();
      } else if(response.state==="claimed"){
        setDone(true);setNote("Invio in verifica: non ripeterlo. Il Comitato controllerà lo stato.");
      } else if(response.state==="failed"){
        setDone(true);setError("Il servizio ha rifiutato il messaggio. Contatta il Comitato senza ripetere l'operazione.");
      } else {
        setError("Richiesta già registrata o in verifica. Non ripetere l'invio.");
      }
    } catch(e){setError(e instanceof Error?e.message:"Invio non disponibile.");}
    finally{setBusy(false);}
  };
  return <div className="mx-auto mt-6 max-w-lg space-y-4">
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Quando inviare il regalo">
      <Button role="radio" aria-checked={when==="now"} variant={when==="now"?"default":"outline"} disabled={busy||done} onClick={()=>setWhen("now")}>Invia ora</Button>
      <Button role="radio" aria-checked={when==="christmas"} variant={when==="christmas"?"default":"outline"} disabled={busy||done} onClick={()=>setWhen("christmas")}>A Natale</Button>
    </div>
    <p className="text-xs text-muted-foreground">Se scegli Natale, il messaggio partirà a partire dalle 00:05 del 25 dicembre (ora italiana).</p>
    <label className="block text-sm">Email di chi riceve il regalo<input type="email" aria-label="Email del destinatario" value={to} disabled={busy||done} onChange={e=>setTo(e.target.value)} maxLength={254} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
    <label className="flex items-start gap-3 text-xs"><input type="checkbox" checked={expected} disabled={busy||done} onChange={e=>setExpected(e.target.checked)} className="mt-1 h-4 w-4"/><span>Ho titolo a utilizzare questo indirizzo e il destinatario si aspetta di ricevere il regalo solidale. <Link to="/privacy" className="text-gold underline">Privacy</Link>.</span></label>
    <Button className="w-full py-4" disabled={busy||done||!to.trim()||!expected} onClick={()=>void submit()}>{busy?"Registro il messaggio…":when==="christmas"?"Programma per Natale":"Invia il regalo ora"}</Button>
    {note&&<p role="status" className="text-sm">{note}</p>}
    {error&&<p role="alert" className="text-sm text-primary">{error}</p>}
  </div>;
}

function LiveReceipt({donationId}:{donationId:string}){
  const send=useServerFn(requestPaidDonorReceipt);
  const [email,setEmail]=useState(""),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[notice,setNotice]=useState("");
  const submit=async()=>{
    const access=loadDonationAccess(donationId);if(!access || busy || done)return;
    setBusy(true);
    try{
      const result=await send({data:{...access,email}});
      setDone(result.state==="accepted"||result.state==="claimed"||result.state==="suppressed");
      setNotice(result.state==="accepted"?"Conferma accettata dal servizio email.":result.state==="claimed"?"Conferma in verifica: non ripetere l'invio.":"Esito email da verificare.");
    }catch(e){setNotice(e instanceof Error?e.message:"Conferma non disponibile.");}
    finally{setBusy(false);}
  };
  return <div className="mx-auto mt-8 max-w-lg border-t border-gold/30 pt-6">
    <h3 className="font-display text-xl">Vuoi ricevere la conferma del gesto?</h3>
    <p className="mt-2 text-xs text-muted-foreground">Facoltativa e distinta dall'email regalo. Non è una ricevuta fiscale.</p>
    <label className="mt-3 block text-sm">La tua email<input type="email" aria-label="La tua email" className="mt-2 w-full rounded-lg border bg-background p-3" maxLength={254} value={email} disabled={done} onChange={e=>setEmail(e.target.value)} /></label>
    <Button className="mt-3" variant="outline" disabled={busy||done||!email.trim()} onClick={()=>void submit()}>Inviami la conferma</Button>
    {notice&&<p className="mt-3 text-sm" role="status">{notice}</p>}
  </div>;
}

/** The donor can only arrive here with a paid donation, verified server-side.
 * Local private details never become part of the public ornament or URL.
 */
export function LiveGiftCompletion({donationId,ornamentId,project}:{donationId:string;ornamentId:string;project:Project}){
  const donate=useServerFn(updatePaidDedication);
  const session=loadGiftSession(project.id);
  const current=session?.request===donationId?session:null;
  const [channel,setChannel]=useState<"whatsapp"|"email">("whatsapp");
  const [sharing,setSharing]=useState(Boolean(current?.sharingComplete));
  const [dedicationNote,setDedicationNote]=useState("");
  const stored=useRef(false);
  useEffect(()=>{
    if(!current || stored.current)return;
    stored.current=true;
    const access=loadDonationAccess(donationId);
    if(!access){setDedicationNote("Per recuperare la dedica usa il dispositivo con cui hai effettuato il pagamento.");return;}
    void donate({data:{...access,consent:current.consent,dedica:current.dedica,firma:current.firma}})
      .then(result=>setDedicationNote(result.status==="pending"?"Dedica pubblica ricevuta: attende la moderazione.":"La pallina è pronta sull'Albero di Monza."))
      .catch(()=>setDedicationNote("La pallina è stata creata, ma la dedica non è stata salvata. Contatta il Comitato prima di ripetere l'operazione."));
  },[current?.request,donationId,donate]);
  const finish=()=>{setSharing(true);if(current)saveGiftSession({...current,id:ornamentId,sharingComplete:true});};
  return <section className="mx-auto max-w-6xl px-4 py-10">
    <div className="mx-auto max-w-xl text-center">
      <span className="text-xs font-semibold uppercase tracking-[.18em] text-gold">Il Natale che fa bene</span>
      <h1 className="mt-3 font-display text-3xl sm:text-4xl">Grazie per il tuo dono solidale!</h1>
      <p className="mt-3 text-muted-foreground">Il pagamento è confermato e la tua pallina è sull'Albero di Monza.</p>
      {dedicationNote&&<p className="mt-3 text-sm text-gold" role="status">{dedicationNote}</p>}
    </div>
    {current?.gift&&<section className="mx-auto mt-6 max-w-5xl rounded-3xl border-2 border-gold/60 bg-secondary/50 p-5 shadow-deep sm:p-7" data-testid="live-delivery-step">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[.15em] text-gold"><Sparkles className="mr-1 inline h-4 w-4"/>Il momento del regalo</p>
        <h2 className="mt-2 font-display text-3xl">Consegna il regalo a {current.to||"chi ami"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Scegli WhatsApp o email. Il pagamento è già stato fatto, non è necessario donare ancora.</p>
        <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Come inviare il regalo">
          <Button role="radio" aria-checked={channel==="whatsapp"} variant={channel==="whatsapp"?"default":"outline"} onClick={()=>setChannel("whatsapp")}><MessageCircle/>WhatsApp</Button>
          <Button role="radio" aria-checked={channel==="email"} variant={channel==="email"?"default":"outline"} onClick={()=>setChannel("email")}><Mail/>Email</Button>
        </div>
      </div>
      {channel==="whatsapp"&&<PostcardStudio project={project} to={current.to} from={current.from} msg={current.msg} ornamentId={ornamentId} onShared={finish}/>}
      {channel==="email"&&<LiveRecipientEmail donationId={donationId} project={project} from={current.from} toName={current.to} msg={current.msg} onAccepted={finish}/>}
    </section>}
    {(!current?.gift||sharing)&&<div role="status" className="mx-auto mt-7 max-w-2xl rounded-3xl border border-gold/40 bg-secondary p-6 text-center" data-testid="live-donor-thanks">
      <h2 className="font-display text-2xl">Il bene continua con te</h2>
      <p className="mt-2 text-sm text-muted-foreground">Condividi il gesto e invita altre persone a sostenere Croce Rossa Monza.</p>
    </div>}
    {(!current?.gift||sharing)&&<SolidarityShare project={project}/>}
    <details className="mx-auto mt-7 max-w-6xl border-y border-gold/30 py-4"><summary className="cursor-pointer font-display text-xl text-gold">Guarda la tua pallina sull'Albero di Monza</summary><TreeExperience focusId={ornamentId}/></details>
    <LiveReceipt donationId={donationId}/>
    <Button variant="outline" asChild className="mt-6"><Link to="/regali">Torna ai progetti</Link></Button>
  </section>;
}
