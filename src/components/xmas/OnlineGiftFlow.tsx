import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Gift, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/data';
import { clientId } from '@/lib/tree-store';
import { createOnlineGift } from '@/lib/online-gift.functions';
import { PostcardStudio } from './PostDonation';
import { TreeExperience } from './TreeExperience';
import { DemoGiftMail } from './DemoGiftMail';
import { GiftEmailAccess } from './GiftEmailAccess';
import { clearGiftSession, loadGiftSession, onlineDedication, rememberSessionOrnament, saveGiftSession } from '@/lib/online-gift-session';
export function OnlineGiftFlow({project,amount,onBack}:{project:Project;amount:number;onBack:()=>void}) {
  const create=useServerFn(createOnlineGift);
  const [to,setTo]=useState(''),[from,setFrom]=useState(''),[msg,setMsg]=useState('');
  const [gift,setGift]=useState(true),[provider,setProvider]=useState<'sumup'|'paypal'>('sumup');
  const [stage,setStage]=useState<'compose'|'payment'|'done'>('compose');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[id,setId]=useState<string|null>(null);
  const request=useRef<string|null>(null);
  const inFlight=useRef(false);
  const [dedica,setDedica]=useState(''),[firma,setFirma]=useState(''),[consent,setConsent]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const saved=loadGiftSession(project.id);
    if(saved && saved.amount===amount){request.current=saved.request;setGiftClient(saved.client);setTo(saved.to);setFrom(saved.from);setMsg(saved.msg);setGift(saved.gift);setProvider(saved.provider);setDedica(saved.dedica);setFirma(saved.firma);setConsent(saved.consent);setId(saved.id);setStage(saved.id?'done':'payment');}
    setReady(true);
  },[project.id,amount]);
  const [giftClient,setGiftClient]=useState<string|null>(null);
  const complete=async()=>{
    if(inFlight.current || id)return;
    const parsed=onlineDedication.safeParse({dedica,firma,consent});
    if(!parsed.success){setError(parsed.error.issues[0]?.message || 'Controlla la dedica.');return;}
    inFlight.current=true;setBusy(true);setError('');
    try {
      request.current ??= crypto.randomUUID();
      const client=clientId();setGiftClient(client);
      const value={project:project.id,amount,request:request.current,client,id:null,kind:project.ornament,gift,to:to.trim(),from:from.trim(),msg:msg.trim(),...parsed.data,provider};
      saveGiftSession(value);
      const row=await create({data:{requestId:request.current,client,kind:project.ornament,amount,provider}});
      const completed={...value,id:row.id};
      saveGiftSession(completed);rememberSessionOrnament(completed);
      setId(row.id);setStage('done');
    }catch(e){setError(e instanceof Error?e.message:'Simulazione non disponibile.');}finally{inFlight.current=false;setBusy(false);}
  };
  const restart=()=>{clearGiftSession();request.current=null;setId(null);setGiftClient(null);setTo('');setFrom('');setMsg('');setDedica('');setFirma('');setConsent(false);setStage('compose');setError('');window.scrollTo({top:0});};
  if(!ready)return <p className="p-8 text-center">Un momento…</p>;
  return <section className="mx-auto max-w-6xl px-4 py-8">
    {stage!=='done' && <div className="mx-auto max-w-lg">
      <Button variant="ghost" onClick={stage==='payment'?()=>setStage('compose'):()=>{clearGiftSession();onBack();}}><ArrowLeft/>Indietro</Button>
      <h1 className="mt-4 font-display text-3xl">{stage==='compose'?'Un regalo per chi ami':'Pagamento simulato'}</h1>
      <p className="mt-3 text-gold">{project.title} · {amount} € · DEMO, nessun incasso</p>
      {stage==='compose'?<>
        <div className="my-5 flex flex-wrap gap-2"><Button variant={gift?'default':'outline'} onClick={()=>setGift(true)}><Gift/>Regala a qualcuno</Button><Button variant={!gift?'default':'ghost'} onClick={()=>setGift(false)}>Solo donazione</Button></div>
        <div className="space-y-4">
          <label className="block">Dedica pubblica sull’albero (facoltativa)<textarea aria-label="Dedica pubblica sull'albero" maxLength={90} rows={3} value={dedica} onChange={e=>setDedica(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
          <label className="block">Firma pubblica facoltativa<input aria-label="Firma pubblica facoltativa" maxLength={40} value={firma} onChange={e=>setFirma(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
          <label className="flex items-start gap-3"><input type="checkbox" aria-label="Acconsento alla pubblicazione di dedica e firma" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Acconsento alla pubblicazione di dedica e firma. In questa DEMO il testo è visibile soltanto in questa sessione del browser, non sugli altri dispositivi.</span></label>
          <p className="text-sm text-muted-foreground">Senza consenso la pallina resta senza testo. Non inserire dati personali di altre persone.</p>
        </div>
        {gift && <div className="mt-5 space-y-4">
          <label className="block">Destinatario (facoltativo)<input aria-label="Destinatario" maxLength={40} value={to} onChange={e=>setTo(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
          <label className="block">Mittente (facoltativo)<input aria-label="Mittente" maxLength={40} value={from} onChange={e=>setFrom(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
          <label className="block">Messaggio privato (facoltativo)<textarea aria-label="Messaggio privato" maxLength={90} rows={3} value={msg} onChange={e=>setMsg(e.target.value)} placeholder={project.postcardLine} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
          <p className="text-sm text-muted-foreground">Nomi e messaggio restano nella cartolina sul dispositivo; se autorizzi una prova email, vengono inclusi solo nel messaggio a Federico. Il destinatario non è pubblicato sull’albero.</p>
        </div>}
        <Button className="mt-6 h-auto w-full py-4" onClick={()=>{const r=onlineDedication.safeParse({dedica,firma,consent});if(!r.success){setError(r.error.issues[0]?.message || 'Controlla i campi.');return;}setError('');setStage('payment');}}>Continua</Button>
        {error && <p role="alert" className="mt-3 text-gold">{error}</p>}
      </>:<>
        <div className="my-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Pagamento simulato">{(['sumup','paypal'] as const).map(p=><Button key={p} role="radio" aria-checked={provider===p} variant={provider===p?'default':'outline'} onClick={()=>setProvider(p)}>{p==='sumup'?'SumUp':'PayPal'} · SIMULATO</Button>)}</div>
        <p className="text-sm text-muted-foreground">Nessuna transazione reale, nessun dato di carta o conto richiesto.</p>
        <Button disabled={busy} className="mt-6 h-auto w-full py-4" onClick={complete}>{busy?'Un momento…':`Simula pagamento di ${amount} €`}</Button>
        {error && <p role="alert" className="mt-4 text-gold">{error}</p>}
      </>}
    </div>}
    {stage==='done' && id && <>
      <h1 className="font-display text-3xl">La tua pallina DEMO è sull’albero digitale.</h1>
      <p className="mt-3 text-muted-foreground">Simulazione completata: nessun pagamento reale. La tua dedica consensuale resta solo in questa sessione del browser; il link su altri dispositivi mostra la pallina senza il testo.</p>
      {consent && dedica && <blockquote className="mx-auto my-5 max-w-lg border-l-2 border-gold pl-4 font-display text-xl">“{dedica}”{firma && <span className="mt-2 block text-sm">— {firma}</span>}</blockquote>}
      <details className="my-5 border-y py-3"><summary className="cursor-pointer font-semibold">Vedi la tua pallina sull’albero</summary><TreeExperience/></details>
      <PostcardStudio project={project} to={gift?to:""} from={from || (consent?firma:"")} msg={msg || (consent?dedica:"")} ornamentId={id} selfThanks={!gift}/>
      {request.current && giftClient && <GiftEmailAccess>{authorized=><>
        <DemoGiftMail authorized={authorized} receipt ornamentId={id} giftRequestId={request.current || ''} client={giftClient} donor={from} toName={to} msg={msg}/>
        <DemoGiftMail authorized={authorized} ornamentId={id} giftRequestId={request.current || ''} client={giftClient} donor={from} toName={to} msg={msg || (consent?dedica:"")}/>
      </>}</GiftEmailAccess>}
      <div className="mx-auto mt-8 max-w-lg space-y-4">
        <Button variant="outline" onClick={restart}>Nuovo regalo o donazione</Button>
        <Button variant="outline" asChild><Link to="/albero" search={{addobbo:id}}>Apri il link alla tua pallina</Link></Button>
      </div>
    </>}
  </section>;
}