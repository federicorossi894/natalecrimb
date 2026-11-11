import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Gift, ArrowLeft, HeartHandshake, MessageCircle, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/data';
import { clientId } from '@/lib/tree-store';
import { createOnlineGift } from '@/lib/online-gift.functions';
import { PostcardStudio } from './PostDonation';
import { TreeExperience } from './TreeExperience';
import { GiftMailForm } from './GiftMailForm';
import { OrnamentIcon } from './Ornament';
import { clearGiftSession, loadGiftSession, onlineDedication, saveGiftSession } from '@/lib/online-gift-session';
import { resolvePublicTreeChoice } from '@/lib/public-tree-choice';
import { SolidarityShare } from './SolidarityShare';
import { LiveGiftFlow } from './LiveGiftFlow';
import { CAMPAIGN } from '@/lib/campaign';
export function OnlineGiftFlow(props: {project:Project;amount:number;onBack:()=>void}) {
  return CAMPAIGN.demo ? <DemoGiftFlow {...props} /> : <LiveGiftFlow {...props} />;
}
function DemoGiftFlow({project,amount,onBack}:{project:Project;amount:number;onBack:()=>void}) {
  const create=useServerFn(createOnlineGift);
  const [to,setTo]=useState(''),[from,setFrom]=useState(''),[msg,setMsg]=useState('');
  const [gift,setGift]=useState(true),[provider,setProvider]=useState<'sumup'|'paypal'>('sumup');
  const [stage,setStage]=useState<'compose'|'payment'|'done'>('compose');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[id,setId]=useState<string|null>(null);
  const request=useRef<string|null>(null);
  const inFlight=useRef(false);
  const [dedica,setDedica]=useState(''),[firma,setFirma]=useState(''),[consent,setConsent]=useState(false);
  const [reusePublicText,setReusePublicText]=useState(true);
  const [ready,setReady]=useState(false);
  const [channel,setChannel]=useState<'whatsapp'|'email'|null>('whatsapp');
  const [thankYou,setThankYou]=useState('');
  const [sharingComplete,setSharingComplete]=useState(false);
  const thanksRef=useRef<HTMLDivElement>(null);
  const donorThanks = thankYou || `Grazie di cuore per il tuo gesto per Monza. ${project.tagline}`;
  useEffect(()=>{
    const saved=loadGiftSession(project.id);
    if(saved && saved.amount===amount){request.current=saved.request;setGiftClient(saved.client);setTo(saved.to);setFrom(saved.from);setMsg(saved.msg);setGift(saved.gift);setProvider(saved.provider);setDedica(saved.dedica);setFirma(saved.firma);setConsent(saved.consent);setReusePublicText(saved.reusePublicText ?? true);setId(saved.id);setThankYou(saved.thankYou ?? '');setSharingComplete(saved.sharingComplete ?? false);setStage(saved.id?'done':'payment');}
    setReady(true);
  },[project.id,amount]);
  useEffect(()=>{if(sharingComplete)thanksRef.current?.scrollIntoView?.({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[sharingComplete]);
  const finishSharing=()=>{
    setSharingComplete(true);
    const saved=loadGiftSession(project.id);
    if(saved?.id===id)saveGiftSession({...saved,sharingComplete:true});
  };
  const [giftClient,setGiftClient]=useState<string|null>(null);
  const treeFields=()=>resolvePublicTreeChoice({gift,reusePersonalText:reusePublicText,personalMessage:msg,personalSignature:from,treeMessage:dedica,treeSignature:firma,publishOnTree:consent});
  const complete=async()=>{
    if(inFlight.current || id)return;
    const parsed=onlineDedication.safeParse(treeFields());
    if(!parsed.success){setError(parsed.error.issues[0]?.message || 'Controlla la dedica.');return;}
    inFlight.current=true;setBusy(true);setError('');
    try {
      request.current ??= crypto.randomUUID();
      const client=clientId();setGiftClient(client);
      const value={project:project.id,amount,request:request.current,client,id:null,kind:project.ornament,gift,to:gift?to.trim():'',from:gift?from.trim():'',msg:gift?msg.trim():'',...parsed.data,provider,reusePublicText};
      saveGiftSession(value);
      const row=await create({data:{requestId:request.current,client,kind:project.ornament,amount,provider,...parsed.data}});
      const completed={...value,id:row.id,thankYou:row.thankYou};
      saveGiftSession(completed);setThankYou(row.thankYou);window.dispatchEvent(new Event('cri-demo-tree'));
      setId(row.id);setStage('done');window.scrollTo({top:0,behavior:'instant'});
    }catch(e){setError(e instanceof Error?e.message:'Simulazione non disponibile.');}finally{inFlight.current=false;setBusy(false);}
  };
  const restart=()=>{clearGiftSession();request.current=null;setId(null);setGiftClient(null);setTo('');setFrom('');setMsg('');setDedica('');setFirma('');setConsent(false);setReusePublicText(true);setThankYou('');setSharingComplete(false);setChannel('whatsapp');setStage('compose');setError('');window.scrollTo({top:0});};
  if(!ready)return <p className="p-8 text-center">Un momento…</p>;
  return <section className="mx-auto max-w-6xl px-4 py-8">
    {stage!=='done' && <div className="mx-auto max-w-lg">
      <Button variant="ghost" onClick={stage==='payment'?()=>setStage('compose'):()=>{clearGiftSession();onBack();}}><ArrowLeft/>Indietro</Button>
      <h1 className="mt-4 font-display text-3xl">{stage==='compose'?'A chi vuoi dedicare il tuo dono?':'Conferma il tuo gesto'}</h1>
      <p className="mt-3 text-gold">{project.title} · {amount} €</p>
      {stage==='compose'?<>
        <div className="my-6 grid gap-3 sm:grid-cols-2" role="group" aria-label="A chi destinare il dono">
          <button type="button" aria-pressed={gift} onClick={()=>{setGift(true);setError("");}} className={`rounded-2xl border p-5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${gift ? "border-gold bg-secondary shadow-deep" : "border-border bg-card hover:border-gold/60"}`}>
            <Gift className="h-6 w-6 text-gold" aria-hidden />
            <span className="mt-3 block font-display text-xl">Regalo a una persona</span>
            <span className="mt-2 block text-sm text-muted-foreground">Una cartolina dedicata, da inviare con WhatsApp o email.</span>
          </button>
          <button type="button" aria-pressed={!gift} onClick={()=>{setGift(false);setError("");}} className={`rounded-2xl border p-5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${!gift ? "border-gold bg-secondary shadow-deep" : "border-border bg-card hover:border-gold/60"}`}>
            <HeartHandshake className="h-6 w-6 text-gold" aria-hidden />
            <span className="mt-3 block font-display text-xl">Regalo a Monza</span>
            <span className="mt-2 block text-sm text-muted-foreground">Un gesto solidale, senza destinatario privato.</span>
          </button>
        </div>
        {gift ? <div className="space-y-4 rounded-2xl border border-gold/30 bg-secondary/35 p-5">
          <h2 className="font-display text-2xl">Il messaggio per chi ami</h2>
          <label className="block text-sm">Per chi è il regalo? (facoltativo)<input aria-label="Destinatario" maxLength={40} value={to} onChange={e=>setTo(e.target.value)} placeholder="Es. Pino" className="mt-2 w-full rounded-lg border bg-background p-3" /></label>
          <label className="block text-sm">Come vuoi firmarti? (facoltativo)<input aria-label="Mittente" maxLength={40} value={from} onChange={e=>setFrom(e.target.value)} placeholder="Es. Federico" className="mt-2 w-full rounded-lg border bg-background p-3" /></label>
          <label className="block text-sm">La tua dedica personale (facoltativa)<textarea aria-label="Messaggio privato" maxLength={90} rows={3} value={msg} onChange={e=>setMsg(e.target.value)} placeholder={project.postcardLine} className="mt-2 w-full rounded-lg border bg-background p-3" /></label>
          <p className="text-xs text-muted-foreground">Nome, firma e messaggio sono destinati alla cartolina privata. Non compaiono sull’albero senza il tuo consenso.</p>
        </div> : <div className="rounded-2xl border border-gold/30 bg-secondary/35 p-5">
          <h2 className="font-display text-2xl">Un regalo per Monza</h2>
          <p className="mt-2 text-sm text-muted-foreground">Puoi lasciare un pensiero e una firma sull’albero, oppure fare un dono anonimo.</p>
        </div>}
        <fieldset className="mt-6 space-y-4 rounded-2xl border border-gold/40 p-5">
          <legend className="px-2 font-display text-xl">La tua pallina sull’Albero di Monza</legend>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" aria-label="Pubblica dedica e firma sull’albero" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" /><span>Voglio pubblicare un messaggio e/o una firma sulla pallina, visibili a tutti. <span className="block text-xs text-muted-foreground">Facoltativo: senza questa scelta la pallina sarà anonima.</span></span></label>
          {gift && consent && <label className="flex items-start gap-3 rounded-xl bg-secondary/45 p-3 text-sm"><input type="checkbox" aria-label="Usa la stessa dedica e firma del regalo" checked={reusePublicText} onChange={e=>setReusePublicText(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" /><span>Usa la stessa dedica e la stessa firma del regalo anche sull’albero. <span className="block text-xs text-muted-foreground">Se disattivi la spunta, puoi scrivere testi diversi per l’albero.</span></span></label>}
          {consent && gift && reusePublicText && <p className="rounded-xl border border-gold/25 bg-background/40 p-3 text-xs text-muted-foreground" role="status">Sull’albero compariranno {msg.trim() ? `«${msg.trim()}»` : "la dedica che scriverai nella cartolina"}{from.trim() ? ` — ${from.trim()}` : ""}. Questi dati saranno pubblici.</p>}
          {consent && (!gift || !reusePublicText) && <div className="space-y-4">
            <label className="block text-sm">Dedica pubblica sull’albero (facoltativa)<textarea aria-label="Dedica pubblica sull’albero" maxLength={90} rows={3} value={dedica} onChange={e=>setDedica(e.target.value)} placeholder="Un pensiero per Monza…" className="mt-2 w-full rounded-lg border bg-background p-3" /></label>
            <label className="block text-sm">Firma pubblica (facoltativa)<input aria-label="Firma pubblica" maxLength={40} value={firma} onChange={e=>setFirma(e.target.value)} placeholder="Il tuo nome, se vuoi" className="mt-2 w-full rounded-lg border bg-background p-3" /></label>
          </div>}
          <p className="text-xs text-muted-foreground">Non inserire dati personali di altre persone nella dedica pubblica. La cartolina privata resta separata.</p>
        </fieldset>
        <p className="mt-4 text-xs text-muted-foreground">I dati inseriti servono alla tua richiesta. <Link to="/privacy" className="font-semibold text-gold underline underline-offset-4">Leggi le informazioni sulla privacy (bozza in revisione)</Link>.</p>
        <Button className="mt-6 h-auto w-full py-4" onClick={()=>{const r=onlineDedication.safeParse(treeFields());if(!r.success){setError(r.error.issues[0]?.message || 'Controlla i campi.');return;}setError('');setStage('payment');}}>Continua</Button>
        {error && <p role="alert" className="mt-3 text-gold">{error}</p>}
      </>:<>
        <div className="my-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Metodo di pagamento">{(['sumup','paypal'] as const).map(p=><Button key={p} role="radio" aria-checked={provider===p} variant={provider===p?'default':'outline'} onClick={()=>setProvider(p)}>{p==='sumup'?'SumUp':'PayPal'}</Button>)}</div>
        <Button disabled={busy} className="mt-6 h-auto w-full py-4" onClick={complete}>{busy?'Un momento…':`Conferma ${amount} €`}</Button>
        {error && <p role="alert" className="mt-4 text-gold">{error}</p>}
      </>}
    </div>}
    {stage==='done' && id && <>
      <div className="mx-auto max-w-xl py-5 text-center">
        <OrnamentIcon kind={project.ornament} className="mx-auto h-24 w-24 drop-shadow-[0_0_24px_var(--gold)]" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[.2em] text-gold">Il Natale che fa bene</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">{gift ? 'La tua pallina è pronta. Fai arrivare il regalo!' : 'Grazie per il tuo dono a Monza!'}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{gift ? 'La pallina è già sull’Albero di Monza. Adesso scegli come consegnare il tuo pensiero.' : 'Il tuo gesto è sull’Albero di Monza. Puoi ritrovare la pallina e condividere la solidarietà.'}</p>
        {consent && (gift && reusePublicText ? msg : dedica) && <blockquote className="mt-5 border-l-2 border-gold pl-4 text-left font-display text-xl">“{gift && reusePublicText ? msg : dedica}”{(gift && reusePublicText ? from : firma) && <span className="mt-2 block text-sm">— {gift && reusePublicText ? from : firma}</span>}</blockquote>}
      </div>
      {gift && <section className="mx-auto mt-3 max-w-5xl rounded-3xl border-2 border-gold/60 bg-secondary/50 p-4 shadow-deep sm:p-7" data-testid="delivery-step">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-gold"><Sparkles className="mr-1 inline h-4 w-4"/>Il momento del regalo</p>
          <h2 className="mt-2 font-display text-3xl">Invia il regalo a {to.trim() || 'chi ami'}</h2>
          <p className="mt-2 text-sm text-muted-foreground">La cartolina è pronta. Scegli WhatsApp o email per farla arrivare davvero.</p>
          <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Come inviare il regalo">
            <Button className="h-auto py-4" role="radio" aria-checked={channel==='whatsapp'} variant={channel==='whatsapp'?'default':'outline'} onClick={()=>setChannel('whatsapp')}><MessageCircle className="h-5 w-5"/>WhatsApp</Button>
            <Button className="h-auto py-4" role="radio" aria-checked={channel==='email'} variant={channel==='email'?'default':'outline'} onClick={()=>setChannel('email')}><Mail className="h-5 w-5"/>Email</Button>
          </div>
        </div>
        {channel==='whatsapp' && <div className="mt-5"><PostcardStudio project={project} to={to} from={from} msg={msg} ornamentId={id} onShared={finishSharing}/></div>}
        {channel==='email' && request.current && giftClient && <div className="mx-auto mt-6 max-w-lg"><GiftMailForm project={project} ornamentId={id} giftRequestId={request.current} client={giftClient} from={from} toName={to} msg={msg} onAccepted={finishSharing}/></div>}
      </section>}
      {(!gift || sharingComplete) && <div ref={thanksRef} role="status" className="mx-auto my-8 max-w-2xl rounded-3xl border border-gold/40 bg-secondary px-6 py-7 text-center" data-testid="donor-thanks">
        <h2 className="font-display text-3xl">Grazie di cuore per il tuo dono</h2>
        <p className="mt-3 font-display text-lg sm:text-xl">{donorThanks}</p>
      </div>}
      {(!gift || sharingComplete) && <SolidarityShare project={project}/>} 
      <details className="mx-auto mt-9 max-w-6xl border-y border-gold/35 py-4" data-testid="gift-tree-details">
        <summary className="cursor-pointer py-3 font-display text-xl text-gold">Guarda la tua pallina sull’Albero di Monza</summary>
        <TreeExperience focusId={id}/>
      </details>
      {request.current && giftClient && <div className="mx-auto mt-8 max-w-lg border-t pt-6">
        <h2 className="mb-3 font-display text-xl">Vuoi ricevere la conferma della donazione via email?</h2>
        <GiftMailForm receipt project={project} ornamentId={id} giftRequestId={request.current} client={giftClient} from="" toName="" msg=""/>
      </div>}
      <div className="mx-auto mt-8 flex max-w-lg flex-wrap gap-3">
        <Button variant="outline" onClick={restart}>Nuovo regalo o donazione</Button>
        <Button variant="outline" asChild><Link to="/albero" search={{addobbo:id}}>Apri il link alla tua pallina</Link></Button>
      </div>
    </>}
  </section>;
}