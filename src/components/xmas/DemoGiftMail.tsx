import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { sendDemoGiftMail } from '@/lib/demo-gift-mail.functions';
export function DemoGiftMail({ornamentId,giftRequestId,client,donor,toName,msg,receipt=false,authorized=false}:{ornamentId:string;giftRequestId:string;client:string;donor:string;toName:string;msg:string;receipt?:boolean;authorized?:boolean}){
  const send=useServerFn(sendDemoGiftMail);
  const [kind,setKind]=useState<'receipt'|'gift_now'|'christmas_simulation'>(receipt?'receipt':'gift_now');
  const [email,setEmail]=useState('federico.rossi@crimonza.org'),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[locked,setLocked]=useState(false);
  const submit=async()=>{
    if(!authorized || !consent || busy || locked || email!=='federico.rossi@crimonza.org')return;
    setBusy(true);setLocked(true);
    try{const r=await send({data:{ornamentId,giftRequestId,client,donor,toName,msg,kind,recipient:'federico.rossi@crimonza.org',approved:true}});
      setStatus(r.state==='accepted'?'Email accettata da Gmail.':r.state==='rate_limited'?'Invio già richiesto o limite raggiunto. Attendi 10 minuti fra invii, massimo 3 al giorno.':r.state==='unknown'?'Esito incerto: controlla la casella prima di riprovare.':r.state==='failed'?'Gmail non ha accettato il messaggio.':'Invio momentaneamente non disponibile.');
    }catch(e){setStatus(e instanceof Error?e.message:'Esito non verificato: non ripetere.');}finally{setBusy(false);setConsent(false);}
  };
  return <section className="mx-auto my-6 max-w-lg space-y-4 border-t py-6">
    <h2 className="font-display text-2xl">{receipt?'Conferma della donazione':'Regala via email'}</h2>
    {!receipt && <label className="block">Quando inviare<select aria-label="Quando inviare" className="mt-2 w-full rounded-md border bg-background p-3" value={kind} disabled={busy} onChange={e=>{setKind(e.target.value==='christmas_simulation'?'christmas_simulation':'gift_now');setLocked(false);setConsent(false);setStatus('');}}><option value="gift_now">Subito</option><option value="christmas_simulation">Natale</option></select></label>}
    <label className="block">{receipt?'Email conferma':'Email regalo'}<input aria-label={receipt?'Email conferma':'Email regalo'} className="mt-2 w-full rounded-md border bg-background p-3" value={email} onChange={e=>setEmail(e.target.value)} type="email" maxLength={255}/></label>
    <label className="flex items-start gap-3"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} aria-label={receipt?'Richiedo la conferma via email':'Desidero inviare il regalo via email'}/><span className="text-sm">{receipt?'Richiedo la conferma via email.':'Desidero inviare il regalo via email.'}</span></label>
    <Button className="h-auto w-full py-4" disabled={!authorized || !consent || busy || locked || email!=='federico.rossi@crimonza.org'} onClick={submit}>{busy?'Invio…':receipt?'Invia conferma':'Invia via email'}</Button>
    {email!=='federico.rossi@crimonza.org' && <p role="alert" className="text-sm text-gold">Indirizzo non autorizzato: nessun messaggio verrà inviato.</p>}
    {status && <p role="status" className="text-sm text-gold">{status}</p>}
  </section>;
}