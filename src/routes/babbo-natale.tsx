import {createFileRoute,Link} from '@tanstack/react-router';
import {useServerFn} from '@tanstack/react-start';
import {useEffect,useState,type FormEvent} from 'react';
import {Gift,HeartHandshake,MapPin,Clock3,ShieldCheck,Snowflake,ArrowRight,CheckCircle2} from 'lucide-react';
import {Shell} from '@/components/xmas/Shell';
import {AutoSantaScene} from '@/components/xmas/SantaChimney';
import {santaPublicSettings,santaCreateRequest} from '@/lib/santa-public.functions';

export const Route=createFileRoute('/babbo-natale')({
 staticData:{sitemap:false},
 head:()=>({meta:[
  {title:'Babbo Natale a domicilio · Il Natale che fa bene · CRI Monza'},
  {name:'description',content:'Nella sera della Vigilia Babbo Natale e gli aiutanti di Croce Rossa Monza consegnano i regali già preparati dalla famiglia. Offerta libera a partire da 30 €.'},
  {name:'robots',content:'noindex, nofollow'},
 ]}),
 component:Babbo,
});
type FormFields={
 nome:string;cognome:string;email:string;telefono:string;
 indirizzo:string;localita:string;numeroBambini:string;
 nomiBambini:string;note:string;offerta:string;privacy:boolean;
};
const empty:FormFields={
 nome:'',cognome:'',email:'',telefono:'',indirizzo:'',localita:'Monza',
 numeroBambini:'1',nomiBambini:'',note:'',offerta:'30',privacy:false,
};
const steps=[
 {icon:Gift,title:'Prepara la sorpresa',body:'Incarta i regali e lasciali pronti fuori dalla porta, poco prima dell’arrivo. Non devi portarli alla sede.'},
 {icon:Snowflake,title:'Arrivano Babbo Natale e gli aiutanti',body:'I volontari CRI, vestiti da Babbo Natale, elfi e aiutanti, recuperano i pacchi, bussano e sorprendono i bambini.'},
 {icon:HeartHandshake,title:'Una visita che resta nel cuore',body:'Circa mezz’ora per consegnare i regali, condividere la magia e scattare una fotografia insieme.'},
];
const faq=[
 ['Devo portare i regali alla Croce Rossa?','No. Prepara i regali già impacchettati e lasciali fuori dalla porta poco prima dell’arrivo dei volontari. La squadra li recupererà prima di bussare.'],
 ['A che ora arriverà Babbo Natale?','Le visite si svolgono la sera del 24 dicembre, indicativamente tra le 19 e mezzanotte. Riceverai l’orario definitivo quando la richiesta sarà confermata.'],
 ['Ho inviato la richiesta: la visita è confermata?','Non ancora. Riceverai una prima email di ricezione e, dopo l’organizzazione delle squadre, una seconda email con la conferma e l’orario definitivo.'],
 ['Quanto devo offrire?','L’offerta è libera a partire da 30 € a famiglia. Puoi indicare un importo più alto. La sola richiesta non comporta alcun addebito.'],
];
const input='mt-2 w-full rounded-2xl border border-border bg-background/85 px-4 py-3 text-base text-foreground outline-offset-2 focus:outline focus:outline-gold';
const euro=(n:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
function Babbo(){
 const settings=useServerFn(santaPublicSettings);
 const submitRequest=useServerFn(santaCreateRequest);
 const [config,setConfig]=useState<{mode:'demo'|'live';requestsOpen:boolean;minContributionEuros:number}|null>(null);
 const [form,setForm]=useState<FormFields>(empty);
 const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
 const [stage,setStage]=useState<'form'|'review'|'done'>('form');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [doneId,setDoneId]=useState('');
 useEffect(()=>{let alive=true;
  settings().then(s=>{if(!alive)return;
   setConfig(s);setForm(p=>({...p,offerta:String(s.minContributionEuros)}));
  }).catch(()=>alive&&setError('Servizio temporaneamente non disponibile.'));
  return()=>{alive=false;};
 },[settings]);
 const change=<K extends keyof FormFields>(key:K,val:FormFields[K])=>{
  setForm(p=>({...p,[key]:val}));setError('');
 };
 const children=form.nomiBambini.split(',').map(v=>v.trim()).filter(Boolean);
 const minimum=config?.minContributionEuros??30;
 const amount=Number(form.offerta.replace(',','.'));
 const goTop=()=>document.getElementById('richiesta')?.scrollIntoView({behavior:'smooth',block:'start'});
 const validate=()=>{
  if(!form.nome.trim()||!form.cognome.trim()||!form.email.includes('@')||
   !form.telefono.trim()||form.indirizzo.trim().length<6||!form.localita.trim()){
   setError('Completa nome, cognome, email, telefono e indirizzo.');return false;
  }
  if(!Number.isInteger(Number(form.numeroBambini))||Number(form.numeroBambini)<1||
     Number(form.numeroBambini)>8||children.length!==Number(form.numeroBambini)){
   setError('Indica il nome di ciascun bambino, separando i nomi con una virgola.');return false;
  }
  if(!Number.isFinite(amount)||!Number.isInteger(amount)||amount<minimum||amount>1000){
   setError('Inserisci un’offerta in euro di almeno '+minimum+' €.');return false;
  }
  if(!form.privacy){setError('Prima di proseguire, conferma di aver letto l’informativa sulla privacy.');return false;}
  setError('');return true;
 };
 const review=(e:FormEvent)=>{e.preventDefault();if(validate()){setStage('review');goTop();}};
 const confirm=async()=>{
  if(!config?.requestsOpen||busy||!validate())return;
  setBusy(true);setError('');
  try{
   const result=await submitRequest({data:{
    requestId,nome:form.nome,cognome:form.cognome,email:form.email,
    telefono:form.telefono,indirizzo:form.indirizzo,localita:form.localita,
    bambini:children,note:form.note,offertaCents:Math.round(amount*100),
    privacyAcknowledged:true as const,website:'',
   }});
   setDoneId(result.id);setStage('done');goTop();
  }catch(err){
   setError(err instanceof Error?err.message:'Richiesta non registrata: riprova.');
  }finally{setBusy(false);}
 };
 const again=()=>{setForm({...empty,offerta:String(minimum)});setRequestId(crypto.randomUUID());setStage('form');setDoneId('');goTop();};
 const row=(key:keyof FormFields,label:string,opts:React.InputHTMLAttributes<HTMLInputElement>={})=>
  <label className="block text-sm font-semibold">{label}
   <input className={input} value={String(form[key])} onChange={e=>change(key,e.target.value)}
    autoComplete="off" required {...opts}/>
  </label>;
 return <Shell hidePiazzaPill>
  {config?.mode==='demo'&&<div role="status" className="mx-auto mt-5 max-w-6xl px-4">
   <div className="rounded-2xl border border-gold bg-gold/15 px-4 py-3 text-center text-sm font-bold tracking-widest">DEMO</div>
  </div>}
  <div className="mx-auto max-w-6xl px-4 pt-6">
   <div className="rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-accent-foreground">🤫 Per i grandi: meglio non far leggere questa pagina ai bambini.</div>
  </div>
  <section className="mx-auto grid max-w-6xl items-end gap-8 px-4 pt-9 md:grid-cols-[1.05fr_1fr]">
   <div className="pb-5">
    <p className="text-xs font-semibold uppercase tracking-[.24em] text-gold">24 dicembre · La Vigilia · Monza e dintorni</p>
    <h1 className="mt-4 font-display text-5xl leading-[1.02] sm:text-7xl">Questa volta, Babbo Natale <em className="not-italic text-gold">bussa davvero.</em></h1>
    <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground/85">La magia arriva sulla soglia di casa. I volontari di Croce Rossa Italiana – Comitato di Monza, vestiti da Babbo Natale e aiutanti, consegnano ai bambini i regali che la tua famiglia ha già preparato.</p>
    <div className="mt-7 flex flex-wrap gap-3">
     <a href="#richiesta" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground">Richiedi la visita <ArrowRight className="h-4 w-4"/></a>
     <a href="#come-funziona" className="inline-flex items-center gap-2 rounded-full border hairline-gold px-6 py-3.5 text-sm font-semibold text-gold">Come funziona</a>
    </div>
   </div>
   <div className="santa-stage overflow-hidden rounded-[2rem] shadow-deep">
    <AutoSantaScene mode="full" className="mx-auto h-[48svh] max-h-[500px] w-full"/>
   </div>
  </section>
  <section id="come-funziona" className="mx-auto mt-16 max-w-6xl scroll-mt-24 px-4">
   <div className="text-center"><p className="text-xs font-semibold uppercase tracking-widest text-gold">Un piccolo segreto fra grandi</p><h2 className="mt-2 font-display text-4xl">Come funziona la sorpresa</h2></div>
   <div className="mt-8 grid gap-4 md:grid-cols-3">{steps.map((step,i)=>
    <article key={step.title} className="glass rounded-[1.75rem] p-6">
     <div className="mb-4 flex items-center justify-between"><step.icon className="h-8 w-8 text-gold"/><span className="font-display text-3xl text-gold/65">0{i+1}</span></div>
     <h3 className="font-display text-2xl">{step.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
    </article>)}</div>
  </section>
  <section className="mx-auto mt-12 max-w-6xl px-4">
   <div className="grid gap-6 rounded-[2rem] border hairline-gold bg-burgundy p-6 sm:grid-cols-[1fr_1.1fr] sm:p-9">
    <div><p className="text-xs uppercase tracking-widest text-gold">Un gesto che fa bene</p>
     <h2 className="mt-2 font-display text-4xl">Offerta libera <span className="text-gold">da {minimum} €</span></h2>
     <p className="mt-3 text-sm text-foreground/85">Scegli tu l’importo da offrire per una visita speciale dei volontari della Croce Rossa.</p>
    </div>
    <div className="space-y-4 text-sm leading-relaxed text-foreground/85">
     <p className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-gold"/>La sera della Vigilia, indicativamente dalle 19 a mezzanotte. Comunicheremo l’orario definitivo nella mail di conferma.</p>
     <p className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold"/>Gli aiutanti di Babbo Natale organizzeranno i giri per raggiungere le famiglie.</p>
     <p className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold"/>Invia la richiesta senza pagare ora: la disponibilità sarà confermata dalla squadra organizzativa.</p>
    </div>
   </div>
  </section>
  <section id="richiesta" className="mx-auto mt-16 max-w-3xl scroll-mt-28 px-4">
   <div className="text-center"><p className="text-xs uppercase tracking-widest text-gold">La visita di Babbo Natale</p>
    <h2 className="mt-2 font-display text-4xl">Richiedi la tua sorpresa</h2>
    <p className="mt-3 text-sm text-muted-foreground">Compila i dati della famiglia. Riceverai una prima email di ricezione e poi, se la visita è disponibile, la conferma con l’orario definitivo.</p>
   </div>
   {stage==='form'&&<form noValidate onSubmit={review} className="glass-strong mt-7 space-y-5 rounded-[2rem] p-5 shadow-deep sm:p-8">
    <div className="grid gap-4 sm:grid-cols-2">
     {row('nome','Nome *',{placeholder:'Giulia'})}
     {row('cognome','Cognome *',{placeholder:'Rossi'})}
     {row('email','Email *',{type:'email',inputMode:'email',placeholder:'nome@esempio.it'})}
     {row('telefono','Telefono *',{type:'tel',inputMode:'tel',placeholder:'333 1234567'})}
    </div>
    <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
     {row('indirizzo','Via e numero civico *',{placeholder:'Via… n. …'})}
     {row('localita','Comune *',{placeholder:'Monza'})}
    </div>
    <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
     {row('numeroBambini','Quanti bambini? *',{type:'number',min:1,max:8})}
     {row('nomiBambini','Nomi dei bambini *',{placeholder:'Anna, Luca'})}
    </div>
    {row('offerta','La tua offerta libera (€) *',{type:'number',min:minimum,max:1000,step:1})}
    <label className="block text-sm font-semibold">Un messaggio per Babbo Natale (facoltativo)
     <textarea className={input} rows={3} maxLength={500} value={form.note}
      onChange={e=>change('note',e.target.value)}
      placeholder="Un piccolo dettaglio per rendere speciale l’incontro: un desiderio, un gioco preferito, una curiosità…"/>
    </label>
    <label className="flex items-start gap-3 text-sm">
     <input type="checkbox" checked={form.privacy} onChange={e=>change('privacy',e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]"/>
     <span>Ho letto l’<Link to="/privacy" className="text-gold underline">informativa sulla privacy</Link> relativa alla gestione della richiesta.</span>
    </label>
    {error&&<p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
    <button type="submit" disabled={!config?.requestsOpen}
     className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground disabled:opacity-50">Vai al riepilogo</button>
    {config&&!config.requestsOpen&&<p className="text-center text-sm text-muted-foreground">Le richieste saranno aperte a breve.</p>}
   </form>}
   {stage==='review'&&<div className="glass-strong mt-7 rounded-[2rem] p-6 shadow-deep sm:p-8">
    <p className="text-xs font-bold uppercase tracking-widest text-gold">La tua richiesta</p>
    <h3 className="mt-3 font-display text-3xl">Famiglia {form.cognome}</h3>
    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
     {([['Referente',form.nome+' '+form.cognome],['Email',form.email],['Telefono',form.telefono],
      ['Domicilio',form.indirizzo+', '+form.localita],['Bambini',children.join(', ')],
      ['Orario','Vigilia tra le 19 e mezzanotte'],['Offerta proposta',euro(amount)],['Note',form.note||'—']] as const).map(([label,val])=>
      <div key={label}><dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{val}</dd></div>)}
    </dl>
    {error&&<p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
     <button type="button" disabled={busy} onClick={()=>{setStage('form');goTop();}} className="rounded-full border hairline-gold px-5 py-3 font-semibold">Modifica</button>
     <button type="button" disabled={busy} onClick={()=>void confirm()}
      className="rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy?'Registrazione…':'Invia la richiesta'}</button>
    </div>
   </div>}
   {stage==='done'&&<div className="glass-strong mt-7 rounded-[2rem] p-8 text-center shadow-deep">
    <CheckCircle2 className="mx-auto h-10 w-10 text-gold"/>
    <h3 className="mt-3 font-display text-3xl">Ho ho ho! Richiesta ricevuta!</h3>
    <p className="mt-3 text-muted-foreground">Gli aiutanti di Babbo Natale hanno ricevuto i tuoi dati. La visita non è ancora confermata: ti scriveremo con l’orario definitivo quando avremo organizzato il giro.</p>
    <p className="mt-4 text-xs text-muted-foreground">Riferimento: {doneId.slice(0,8).toUpperCase()}</p>
    <button type="button" onClick={again} className="mt-6 rounded-full border hairline-gold px-6 py-3">Invia un’altra richiesta</button>
   </div>}
  </section>
  <section className="mx-auto mt-20 max-w-4xl px-4" id="faq">
   <p className="text-center text-xs uppercase tracking-widest text-gold">Per i grandi</p>
   <h2 className="mt-2 text-center font-display text-4xl">Domande frequenti</h2>
   <div className="mt-6 space-y-3">{faq.map(([q,a])=><details key={q} className="glass rounded-2xl px-5 py-4">
    <summary className="cursor-pointer font-semibold">{q}</summary>
    <p className="pt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
   </details>)}</div>
   <p className="mt-7 text-center text-sm text-muted-foreground">Hai qualche domanda? Scrivi agli aiutanti di Babbo Natale: <a href="mailto:natale@crimonza.org" className="font-semibold text-gold underline">natale@crimonza.org</a>.</p>
  </section>
  <section className="mx-auto mt-20 max-w-4xl px-4 pb-6">
   <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border hairline-gold p-5 text-center sm:flex-row sm:text-left">
    <div><p className="text-xs font-bold uppercase tracking-widest text-gold">Solo per gli organizzatori</p>
     <p className="mt-1 text-sm text-muted-foreground">Prenotazioni, squadre e organizzazione delle visite.</p></div>
    <Link to="/babbo-natale/organizzatori" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gold px-5 py-3 text-sm font-semibold text-gold">Area organizzatori <ArrowRight className="h-4 w-4"/></Link>
   </div>
  </section>
 </Shell>;
}
