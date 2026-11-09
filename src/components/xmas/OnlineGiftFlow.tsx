import { useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Gift, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/data';
import { clientId } from '@/lib/tree-store';
import { createOnlineGift } from '@/lib/online-gift.functions';
import { PostcardStudio } from './PostDonation';
import { TreeExperience } from './TreeExperience';
import { DemoGiftMail } from './DemoGiftMail';
export function OnlineGiftFlow({project,amount,onBack}:{project:Project;amount:number;onBack:()=>void}) {
  const create=useServerFn(createOnlineGift);
  const [to,setTo]=useState(''),[from,setFrom]=useState(''),[msg,setMsg]=useState('');
  const [gift,setGift]=useState(true),[provider,setProvider]=useState<'sumup'|'paypal'>('sumup');
  const [stage,setStage]=useState<'compose'|'payment'|'done'>('compose');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[id,setId]=useState<string|null>(null);
  const request=useRef<string|null>(null);
  const [giftClient,setGiftClient]=useState<string|null>(null);
  const complete=async()=>{
    if(busy || id)return; setBusy(true);setError('');
    const key=`cri-online-gift:${project.id}:${amount}`;
    try {
      request.current ??= sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key,request.current);
      const client=clientId();setGiftClient(client);
      const row=await create({data:{requestId:request.current,client,kind:project.ornament,amount,provider}});
      setId(row.id);setStage('done');
    }catch(e){setError(e instanceof Error?e.message:'Simulazione non disponibile.');}finally{setBusy(false);}
  };
  return <section className="mx-auto max-w-6xl px-4 py-8">
    {stage!=='done' && <div className="mx-auto max-w-lg">
      <Button variant="ghost" onClick={stage==='payment'?()=>setStage('compose'):onBack}><ArrowLeft/>Indietro</Button>
      <h1 className="mt-4 font-display text-3xl">{stage==='compose'?'Un regalo per chi ami':'Pagamento simulato'}</h1>
      <p className="mt-3 text-gold">{project.title} · {amount} € · DEMO, nessun incasso</p>
      {stage==='compose'?<>
        <div className="my-5 flex flex-wrap gap-2"><Button variant={gift?'default':'outline'} onClick={()=>setGift(true)}><Gift/>Regala a qualcuno</Button><Button variant={!gift?'default':'ghost'} onClick={()=>setGift(false)}>Solo donazione</Button></div>
        {gift && <div className="space-y-4">
          <label className="block">Destinatario (facoltativo)<input aria-label="Destinatario" maxLength={40} value={to} onChange={e=>setTo(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
          <label className="block">Mittente (facoltativo)<input aria-label="Mittente" maxLength={40} value={from} onChange={e=>setFrom(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
          <label className="block">Messaggio privato (facoltativo)<textarea aria-label="Messaggio privato" maxLength={90} rows={3} value={msg} onChange={e=>setMsg(e.target.value)} placeholder={project.postcardLine} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
          <p className="text-sm text-muted-foreground">Nomi e messaggio restano in questa cartolina sul tuo dispositivo. L’albero pubblico mostra solo il progetto.</p>
        </div>}
        <Button className="mt-6 h-auto w-full py-4" onClick={()=>setStage('payment')}>Continua</Button>
      </>:<>
        <div className="my-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Pagamento simulato">{(['sumup','paypal'] as const).map(p=><Button key={p} role="radio" aria-checked={provider===p} variant={provider===p?'default':'outline'} onClick={()=>setProvider(p)}>{p==='sumup'?'SumUp':'PayPal'} · SIMULATO</Button>)}</div>
        <p className="text-sm text-muted-foreground">Nessuna transazione reale, nessun dato di carta o conto richiesto.</p>
        <Button disabled={busy} className="mt-6 h-auto w-full py-4" onClick={complete}>{busy?'Un momento…':`Simula pagamento di ${amount} €`}</Button>
        {error && <p role="alert" className="mt-4 text-gold">{error}</p>}
      </>}
    </div>}
    {stage==='done' && id && <>
      <h1 className="font-display text-3xl">La tua pallina DEMO è sull’albero digitale.</h1>
      <p className="mt-3 text-muted-foreground">Simulazione completata: nessun pagamento reale. Una sola pallina, senza nomi o messaggi pubblici.</p>
      <TreeExperience focusId={id}/>
      {gift && <PostcardStudio project={project} to={to} from={from} msg={msg} ornamentId={id}/>}
      {request.current && giftClient && <>
        <DemoGiftMail receipt ornamentId={id} giftRequestId={request.current} client={giftClient} donor={from} toName={to} msg={msg}/>
        {gift && <DemoGiftMail ornamentId={id} giftRequestId={request.current} client={giftClient} donor={from} toName={to} msg={msg}/>}
      </>}
      <div className="mx-auto mt-8 max-w-lg space-y-4">
        <Button variant="outline" asChild><Link to="/albero" search={{addobbo:id}}>Apri il link alla tua pallina</Link></Button>
      </div>
    </>}
  </section>;
}