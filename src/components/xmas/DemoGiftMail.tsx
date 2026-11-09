import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { sendDemoGiftMail } from '@/lib/demo-gift-mail.functions';
export function DemoGiftMail({ornamentId,giftRequestId,client,donor,toName,msg,receipt=false}:{ornamentId:string;giftRequestId:string;client:string;donor:string;toName:string;msg:string;receipt?:boolean}){
  const send=useServerFn(sendDemoGiftMail);
  const [kind,setKind]=useState<'receipt'|'gift_now'|'christmas_simulation'>(receipt?'receipt':'gift_now');
  const [email,setEmail]=useState('federico.rossi@crimonza.org'),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[locked,setLocked]=useState(false);
  const submit=async()=>{
    if(!consent || busy || locked || email!=='federico.rossi@crimonza.org')return;
    setBusy(true);setLocked(true);
    try{const r=await send({data:{ornamentId,giftRequestId,client,donor,toName,msg,kind,recipient:'federico.rossi@crimonza.org',approved:true}});
      setStatus(r.state==='accepted'?'Accettata da Gmail; ricezione in casella non ancora verificata.':r.state==='rate_limited'?'Prova già richiesta o limite raggiunto: 10 minuti fra prove, massimo 3 al giorno.':r.state==='unknown'?'Esito incerto: non ripetere, controlla la casella.':r.state==='failed'?'Gmail non ha accettato la prova. Non ripetere automaticamente.':'Invio non disponibile: nessuna conferma di invio.');
    }catch(e){setStatus(e instanceof Error?e.message:'Esito non verificato: non ripetere.');}finally{setBusy(false);setConsent(false);}
  };
  return <section className="mx-auto my-6 max-w-lg space-y-4 border-t py-6">
    <h2 className="font-display text-2xl">{receipt?'Conferma informativa DEMO':'Regala via email'}</h2>
    <p className="text-sm text-muted-foreground">In questa demo i messaggi reali possono essere inviati soltanto alla casella di prova di Federico; accedi al QA come account CRI. Nessun invio a destinatari diversi.</p>
    {!receipt && <label className="block">Quando inviare<select aria-label="Quando inviare" className="mt-2 w-full rounded-md border bg-background p-3" value={kind} disabled={busy} onChange={e=>{setKind(e.target.value==='christmas_simulation'?'christmas_simulation':'gift_now');setLocked(false);setConsent(false);setStatus('');}}><option value="gift_now">Subito</option><option value="christmas_simulation">Natale · simulazione inviata subito</option></select></label>}
    <label className="block">{receipt?'Email conferma DEMO':'Email regalo DEMO'}<input aria-label={receipt?'Email conferma DEMO':'Email regalo DEMO'} className="mt-2 w-full rounded-md border bg-background p-3" value={email} onChange={e=>setEmail(e.target.value)} type="email" maxLength={255}/></label>
    <label className="flex items-start gap-3"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} aria-label={receipt?'Richiedo la conferma informativa e autorizzo la prova reale':'Autorizzo l’email regalo reale alla casella Federico'}/><span className="text-sm">{receipt?'Richiedo la conferma informativa e autorizzo la prova reale. Non è una ricevuta fiscale.':'Autorizzo questa email regalo reale alla casella Federico.'}</span></label>
    <Button className="h-auto w-full py-4" disabled={!consent || busy || locked || email!=='federico.rossi@crimonza.org'} onClick={submit}>{busy?'Verifica e invio…':receipt?'Invia ora email di prova':'Invia via email'}</Button>
    {email!=='federico.rossi@crimonza.org' && <p role="alert" className="text-sm text-gold">Indirizzo non autorizzato: nessun messaggio verrà inviato.</p>}
    {status && <p role="status" className="text-sm text-gold">{status}</p>}
    <p className="text-sm text-muted-foreground">[DEMO — NESSUN PAGAMENTO] · Una prova ogni 10 minuti, massimo tre al giorno. Natale in DEMO invia subito, non programma.</p>
    <Link to="/email-qa" className="text-sm underline">Accesso QA · account CRI</Link>
  </section>;
}