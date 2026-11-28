import {createFileRoute,Link,Outlet,useRouterState} from '@tanstack/react-router';
import {useServerFn} from '@tanstack/react-start';
import {useEffect,useState,type FormEvent} from 'react';
import {Gift,HeartHandshake,MapPin,Clock3,ShieldCheck,Snowflake,ArrowRight,CheckCircle2,Heart,Minus,Plus} from 'lucide-react';
import {Shell} from '@/components/xmas/Shell';
import {AutoSantaScene} from '@/components/xmas/SantaChimney';
import {santaPublicSettings,santaCreateRequest} from '@/lib/santa-public.functions';
import type {SantaChild} from '@/lib/santa-planner';

export const Route=createFileRoute('/babbo-natale')({
 staticData:{sitemap:false},
 head:()=>({meta:[
  {title:'Babbo Natale a domicilio · Il Natale che fa bene · CRI Monza'},
  {name:'description',content:'La Vigilia, Babbo Natale e i volontari di Croce Rossa Monza portano la magia fin sulla soglia di casa. Richiedi la visita con un’offerta libera a partire da 30 €.'},
  {name:'robots',content:'noindex, nofollow'},
 ]}),
 component:BabboRouteView,
});
/** The generated router nests /babbo-natale/organizzatori under this page.
 * Its content must render through Outlet instead of showing Babbo again.
 */
function BabboRouteView(){
 const path=useRouterState({select:s=>s.location.pathname});
 return path.startsWith('/babbo-natale/')?<Outlet/>:<Babbo/>;
}
type FormFields={
 nome:string;cognome:string;email:string;telefono:string;
 indirizzo:string;localita:string;piano:string;dettagliAccesso:string;
 note:string;offerta:string;privacy:boolean;
};
type ChildDraft={nome:string;cognome:string;soprannome:string;eta:string};
const blankChild=():ChildDraft=>({nome:'',cognome:'',soprannome:'',eta:''});
const empty:FormFields={
 nome:'',cognome:'',email:'',telefono:'',indirizzo:'',localita:'Monza',
 piano:'',dettagliAccesso:'',note:'',offerta:'30',privacy:false,
};
const steps=[
 {icon:Gift,title:'Il segreto comincia da te',body:'Scegli i regali, incartali con cura e, poco prima della visita, lasciali appena fuori dalla porta. Babbo Natale li recupererà senza farsi notare.'},
 {icon:Snowflake,title:'Un campanello, una sorpresa',body:'Alla porta arrivano Babbo Natale e i suoi aiutanti: sono i volontari della Croce Rossa di Monza, pronti a regalare ai bambini un incontro davvero speciale.'},
 {icon:HeartHandshake,title:'Ricordi belli, gesti che contano',body:'Circa mezz’ora tra la consegna dei regali, sorrisi e fotografie. Un momento di felicità per la famiglia e un gesto di solidarietà per la città.'},
];
const faq=[
 ['Come devo preparare i regali?','Bastano i pacchi già incartati. Poco prima dell’orario concordato, sistemali appena fuori dalla porta in un punto sicuro: i volontari li prenderanno prima di suonare il campanello.'],
 ['Quando arriverà Babbo Natale?','La sorpresa è prevista per la sera della Vigilia, indicativamente dalle 19:00 a mezzanotte. L’orario della tua visita sarà comunicato nella mail di conferma.'],
 ['La richiesta vale già come prenotazione?','L’invio della richiesta è il primo passo: riceverai una mail che ne conferma la ricezione. Quando avremo organizzato i giri, ti scriveremo nuovamente per confermare la visita e l’orario.'],
 ['Come funziona l’offerta?','L’offerta è libera, a partire da 30 € per famiglia. Se vuoi, puoi scegliere di donare di più: ogni contributo sostiene le attività solidali della Croce Rossa di Monza. Non è previsto alcun addebito quando invii la richiesta.'],
];
const input='mt-2 w-full rounded-2xl border border-border bg-background/85 px-4 py-3 text-base text-foreground outline-offset-2 focus:outline focus:outline-gold';
const euro=(n:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
function Babbo(){
 const settings=useServerFn(santaPublicSettings);
 const submitRequest=useServerFn(santaCreateRequest);
 const [config,setConfig]=useState<{mode:'demo'|'live';requestsOpen:boolean;minContributionEuros:number}|null>(null);
 const [form,setForm]=useState<FormFields>(empty);
 const [kids,setKids]=useState<ChildDraft[]>([blankChild()]);
 const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
 const [stage,setStage]=useState<'form'|'review'|'done'>('form');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [doneId,setDoneId]=useState('');
 const [otherAmount,setOtherAmount]=useState(false);
 useEffect(()=>{let alive=true;
  settings().then(s=>{if(!alive)return;
   setConfig(s);setForm(p=>({...p,offerta:String(s.minContributionEuros)}));
  }).catch(()=>alive&&setError('Servizio temporaneamente non disponibile.'));
  return()=>{alive=false;};
 },[settings]);
 const change=<K extends keyof FormFields>(key:K,val:FormFields[K])=>{
  setForm(p=>({...p,[key]:val}));setError('');
 };
 const children=kids.map(k=>{
  const suffix=k.soprannome.trim()?' (“'+k.soprannome.trim()+'”)':'';
  return [k.nome.trim(),k.cognome.trim()].filter(Boolean).join(' ')+suffix+
    (k.eta.trim()?' · '+k.eta.trim()+(k.eta.trim()==='1'?' anno':' anni'):'');
 });
 const updateChild=(i:number,key:keyof ChildDraft,value:string)=>{
  setKids(current=>current.map((k,j)=>j===i?{...k,[key]:value}:k));setError('');
 };
 const setChildrenCount=(n:number)=>{
  setKids(current=>n>current.length&&n<=8?[...current,blankChild()]:
   n<current.length&&n>=1?current.slice(0,-1):current);
  setError('');
 };
 const details=():SantaChild[]=>
  kids.map(k=>({nome:k.nome.trim(),cognome:k.cognome.trim(),
   soprannome:k.soprannome.trim(),eta:Number(k.eta)}));
 const minimum=config?.minContributionEuros??30;
 const amount=Number(form.offerta.replace(',','.'));
 const suggestedAmounts=[minimum,minimum+10,minimum+20,minimum+45,minimum+70].filter(n=>n<=1000);
 const selectAmount=(n:number)=>{change('offerta',String(n));setOtherAmount(false);};
 const goTop=()=>document.getElementById('richiesta')?.scrollIntoView({behavior:'smooth',block:'start'});
 const validate=()=>{
  if(!form.nome.trim()||!form.cognome.trim()||!form.email.includes('@')||
   !form.telefono.trim()||form.indirizzo.trim().length<6||!form.localita.trim()||!form.piano.trim()){
   setError('Completa i dati del genitore e l’indirizzo, compreso il piano.');return false;
  }
  if(kids.length<1||kids.length>8||kids.some(k=>
   !k.nome.trim()||!k.cognome.trim()||k.eta.trim()===''||
   !Number.isInteger(Number(k.eta))||Number(k.eta)<0||Number(k.eta)>120)){
   setError('Per ogni bambino indica nome, cognome ed età in anni. Il soprannome è facoltativo.');return false;
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
    piano:form.piano,dettagliAccesso:form.dettagliAccesso,
    bambiniDettagli:details(),note:form.note,offertaCents:Math.round(amount*100),
    privacyAcknowledged:true as const,website:'',
   }});
   setDoneId(result.id);setStage('done');goTop();
  }catch(err){
   setError(err instanceof Error?err.message:'Richiesta non registrata: riprova.');
  }finally{setBusy(false);}
 };
 const again=()=>{setForm({...empty,offerta:String(minimum)});setKids([blankChild()]);setOtherAmount(false);setRequestId(crypto.randomUUID());setStage('form');setDoneId('');goTop();};
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
   <div className="rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-accent-foreground">🤫 Un piccolo segreto per i grandi: la sorpresa è più bella se i bambini non la scoprono in anticipo.</div>
  </div>
  <section className="mx-auto grid max-w-6xl items-end gap-8 px-4 pt-9 md:grid-cols-[1.05fr_1fr]">
   <div className="pb-5">
    <p className="text-xs font-semibold uppercase tracking-[.24em] text-gold">Babbo Natale a domicilio · La Vigilia del 24 dicembre</p>
    <h1 className="mt-4 font-display text-5xl leading-[1.02] sm:text-7xl">La magia del Natale <em className="not-italic text-gold">bussa alla tua porta.</em></h1>
    <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground/85">Immagina il campanello che suona e gli occhi dei bambini quando, sulla soglia, compare Babbo Natale con i suoi aiutanti. Per una sera i volontari della Croce Rossa Italiana – Comitato di Monza trasformano i regali preparati in famiglia in una sorpresa indimenticabile. Una bella emozione per i più piccoli, un gesto che fa bene a tutta la comunità.</p>
    <div className="mt-7 flex flex-wrap gap-3">
     <a href="#richiesta" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground">Invita Babbo Natale <ArrowRight className="h-4 w-4"/></a>
     <a href="#come-funziona" className="inline-flex items-center gap-2 rounded-full border hairline-gold px-6 py-3.5 text-sm font-semibold text-gold">Come funziona</a>
    </div>
   </div>
   <div className="santa-stage overflow-hidden rounded-[2rem] shadow-deep">
    <AutoSantaScene mode="full" className="mx-auto h-[48svh] max-h-[500px] w-full"/>
   </div>
  </section>
  <section id="come-funziona" className="mx-auto mt-16 max-w-6xl scroll-mt-24 px-4">
   <div className="text-center"><p className="text-xs font-semibold uppercase tracking-widest text-gold">La magia comincia prima del campanello</p><h2 className="mt-2 font-display text-4xl">Tre passi verso una Vigilia speciale</h2></div>
   <div className="mt-8 grid gap-4 md:grid-cols-3">{steps.map((step,i)=>
    <article key={step.title} className="glass rounded-[1.75rem] p-6">
     <div className="mb-4 flex items-center justify-between"><step.icon className="h-8 w-8 text-gold"/><span className="font-display text-3xl text-gold/65">0{i+1}</span></div>
     <h3 className="font-display text-2xl">{step.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
    </article>)}</div>
  </section>
  <section className="mx-auto mt-12 max-w-6xl px-4">
   <div className="grid gap-6 rounded-[2rem] border hairline-gold bg-burgundy p-6 sm:grid-cols-[1fr_1.1fr] sm:p-9">
    <div><p className="text-xs uppercase tracking-widest text-gold">Una sorpresa per loro, un aiuto per tanti</p>
     <h2 className="mt-2 font-display text-4xl">Regala un'emozione. <span className="text-gold">Fai del bene.</span></h2>
     <p className="mt-3 text-base font-semibold text-gold">Offerta libera a partire da {minimum} €.</p>
     <p className="mt-2 text-sm leading-relaxed text-foreground/85">Con la tua offerta sostieni le attività della Croce Rossa di Monza. Scegli tu quanto donare: ogni gesto in più conta.</p>
    </div>
    <div className="space-y-5 text-sm leading-relaxed text-foreground/90">
     <div className="rounded-2xl border border-gold/35 bg-black/10 px-4 py-5 sm:px-5">
      <div className="flex items-start gap-3">
       <Clock3 aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-gold"/>
       <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-gold">La Vigilia · 24 dicembre</p>
        <p className="mt-2 font-display text-xl leading-snug text-foreground sm:text-2xl">Dalle 19:00 a mezzanotte</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">Le visite si svolgeranno indicativamente in questa fascia. Riceverai l’orario preciso nella mail di conferma.</p>
       </div>
      </div>
     </div>
     <div className="flex items-start gap-3">
      <MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gold"/>
      <p className="min-w-0 flex-1">I nostri volontari organizzeranno le visite per portare la magia direttamente a casa tua.</p>
     </div>
     <div className="flex items-start gap-3">
      <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gold"/>
      <p className="min-w-0 flex-1">Per ora basta inviare la richiesta: nessun pagamento anticipato. Ti scriveremo per confermare la visita.</p>
     </div>
    </div>
   </div>
  </section>
  <section id="richiesta" className="mx-auto mt-16 max-w-3xl scroll-mt-28 px-4">
   <div className="text-center"><p className="text-xs uppercase tracking-widest text-gold">Facci conoscere la tua famiglia</p>
    <h2 className="mt-2 font-display text-4xl">Prepariamo insieme la sorpresa</h2>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Raccontaci chi aspetterà Babbo Natale e dove raggiungervi. Una prima email ti dirà che la richiesta è arrivata; gli aiutanti ti scriveranno di nuovo con la conferma e l’orario della visita.</p>
   </div>
   {stage==='form'&&<form noValidate onSubmit={review} className="glass-strong mt-7 space-y-5 rounded-[2rem] p-5 shadow-deep sm:p-8">
    <div className="grid gap-4 sm:grid-cols-2">
     {row('nome','Nome del genitore *',{placeholder:'Giulia'})}
     {row('cognome','Cognome del genitore *',{placeholder:'Rossi'})}
     {row('email','Email *',{type:'email',inputMode:'email',placeholder:'nome@esempio.it'})}
     {row('telefono','Telefono *',{type:'tel',inputMode:'tel',placeholder:'333 1234567'})}
    </div>
    <fieldset className="space-y-4 rounded-3xl border border-border/70 bg-background/35 p-4 sm:p-5">
     <legend className="px-2 font-display text-2xl">Dove arriverà Babbo Natale</legend>
     <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
      {row('indirizzo','Via e numero civico *',{placeholder:'Via… n. …'})}
      {row('localita','Comune *',{placeholder:'Monza'})}
     </div>
     <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
      {row('piano','Piano *',{placeholder:'Terra, 1°, 2°…',maxLength:60})}
      {row('dettagliAccesso','Citofono, scala, interno, indicazioni utili',{placeholder:'Citofono Rossi, scala B, interno 4…',maxLength:240,required:false})}
     </div>
     <p className="text-xs leading-relaxed text-muted-foreground">Aiutaci a trovare facilmente la porta giusta, così la sorpresa arriverà al momento perfetto.</p>
    </fieldset>
    <fieldset className="space-y-4 rounded-3xl border border-gold/40 bg-gold/5 p-4 sm:p-5">
     <legend className="px-2 font-display text-2xl">Chi aspetta Babbo Natale?</legend>
     <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-semibold">Quanti bambini parteciperanno?</p>
       <p className="mt-1 text-xs text-muted-foreground">Prepareremo una sorpresa per ognuno di loro.</p></div>
      <div className="flex items-center gap-3 rounded-full border border-gold/40 bg-background px-3 py-2">
       <button type="button" onClick={()=>setChildrenCount(kids.length-1)} disabled={kids.length<=1}
        aria-label="Un bambino in meno" className="rounded-full p-1.5 disabled:opacity-30"><Minus className="h-5 w-5"/></button>
       <strong aria-live="polite" className="min-w-5 text-center text-lg tabular-nums">{kids.length}</strong>
       <button type="button" onClick={()=>setChildrenCount(kids.length+1)} disabled={kids.length>=8}
        aria-label="Un bambino in più" className="rounded-full p-1.5 disabled:opacity-30"><Plus className="h-5 w-5"/></button>
      </div>
     </div>
     <div className="space-y-4">{kids.map((child,i)=>
      <div key={i} className="rounded-2xl border border-gold/25 bg-background/80 p-4">
       <p className="mb-3 text-sm font-semibold text-gold">{i===0?'Primo bambino':`Bambino ${i+1}`}</p>
       <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Nome *<input className={input} value={child.nome} maxLength={60}
         onChange={e=>updateChild(i,'nome',e.target.value)} placeholder="Anna" required/></label>
        <label className="text-sm font-semibold">Cognome *<input className={input} value={child.cognome} maxLength={60}
         onChange={e=>updateChild(i,'cognome',e.target.value)} placeholder="Rossi" required/></label>
        <label className="text-sm font-semibold">Soprannome (facoltativo)<input className={input} value={child.soprannome} maxLength={40}
         onChange={e=>updateChild(i,'soprannome',e.target.value)} placeholder="Come lo chiamano in famiglia?"/></label>
        <label className="text-sm font-semibold">Età *<input className={input} type="number" inputMode="numeric" min={0} max={120} step={1}
         value={child.eta} onChange={e=>updateChild(i,'eta',e.target.value)} placeholder="6" required/></label>
       </div>
      </div>)}</div>
    </fieldset>
    <fieldset className="rounded-[1.75rem] border border-gold/50 bg-gradient-to-br from-gold/15 via-secondary/60 to-background p-5 sm:p-6">
     <legend className="px-2 text-sm font-semibold text-gold">Il tuo gesto solidale</legend>
     <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><Heart className="h-5 w-5 text-gold"/><span className="text-sm font-semibold">La tua offerta</span></div>
      <strong aria-live="polite" aria-atomic="true" className="font-display text-4xl tabular-nums text-gold">{Number.isFinite(amount)?euro(amount):'—'}</strong>
     </div>
     <p className="mt-3 text-sm leading-relaxed text-foreground/80">Si parte da {euro(minimum)}. Se desideri, puoi aggiungere un po' di solidarietà con un semplice tocco.</p>
     <div role="group" aria-label="Scegli l'importo dell'offerta" className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {suggestedAmounts.map(n=><button key={n} type="button" onClick={()=>selectAmount(n)}
       aria-pressed={amount===n&&!otherAmount}
       className={amount===n&&!otherAmount?
        "rounded-2xl border border-gold bg-gold px-2 py-3 text-base font-bold tabular-nums text-accent-foreground shadow-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold":
        "rounded-2xl border border-gold/40 bg-background/75 px-2 py-3 text-base font-bold tabular-nums text-foreground transition hover:border-gold hover:bg-gold/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"}>
       {euro(n)}
      </button>)}
      <button type="button" onClick={()=>setOtherAmount(true)}
       aria-pressed={otherAmount} aria-expanded={otherAmount}
       className={otherAmount?
        "rounded-2xl border border-gold bg-gold px-2 py-3 text-base font-bold text-accent-foreground shadow-md":
        "rounded-2xl border border-gold/40 bg-background/75 px-2 py-3 text-base font-bold text-foreground hover:border-gold hover:bg-gold/15"}>
       Altro importo
      </button>
     </div>
     {otherAmount&&<label className="mt-4 block text-sm font-semibold" htmlFor="santa-offerta-libera">
      Inserisci l'importo che preferisci (€)
      <input id="santa-offerta-libera" className={input} type="number" inputMode="numeric"
       min={minimum} max={1000} step={1} value={form.offerta}
       onChange={e=>change('offerta',e.target.value)} onFocus={e=>e.currentTarget.select()}
       aria-describedby="santa-offerta-minima"/>
     </label>}
     <p id="santa-offerta-minima" className="mt-4 text-xs leading-relaxed text-muted-foreground">L'offerta è libera, da {euro(minimum)}. Non viene addebitato nulla quando invii la richiesta.</p>
    </fieldset>
    <label className="block text-sm font-semibold">Tradizioni di famiglia e informazioni per Babbo Natale (facoltativo)
     <textarea className={input} rows={3} maxLength={500} value={form.note}
      onChange={e=>change('note',e.target.value)}
      placeholder="Una tradizione di Natale, una passione, un episodio divertente o qualcosa di speciale che Babbo Natale dovrebbe sapere…"/>
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
    <p className="text-xs font-bold uppercase tracking-widest text-gold">Il riepilogo della sorpresa</p>
    <h3 className="mt-3 font-display text-3xl">Famiglia {form.cognome}</h3>
    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
     {([['Referente',form.nome+' '+form.cognome],['Email',form.email],['Telefono',form.telefono],
      ['Domicilio',[form.indirizzo,form.localita,'Piano '+form.piano,form.dettagliAccesso].filter(Boolean).join(' · ')],['Bambini ('+kids.length+')',children.join(' | ')],
      ['Quando','Vigilia, dalle 19:00 a mezzanotte'],['Offerta proposta',euro(amount)],['Tradizioni e informazioni',form.note||'—']] as const).map(([label,val])=>
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
    <h3 className="mt-3 font-display text-3xl">Ho ho ho! Il messaggio è arrivato!</h3>
    <p className="mt-3 text-muted-foreground">Gli aiutanti hanno preso nota della vostra sorpresa! Organizzeremo il giro della Vigilia e, appena possibile, ti scriveremo per confermare la visita e comunicarti l’orario esatto.</p>
    <p className="mt-4 text-xs text-muted-foreground">Riferimento: {doneId.slice(0,8).toUpperCase()}</p>
    <button type="button" onClick={again} className="mt-6 rounded-full border hairline-gold px-6 py-3">Invia un’altra richiesta</button>
   </div>}
  </section>
  <section className="mx-auto mt-20 max-w-4xl px-4" id="faq">
   <p className="text-center text-xs uppercase tracking-widest text-gold">Ogni magia ha i suoi piccoli segreti</p>
   <h2 className="mt-2 text-center font-display text-4xl">Tutto quello che vuoi sapere</h2>
   <div className="mt-6 space-y-3">{faq.map(([q,a])=><details key={q} className="glass rounded-2xl px-5 py-4">
    <summary className="cursor-pointer font-semibold">{q}</summary>
    <p className="pt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
   </details>)}</div>
   <p className="mt-7 text-center text-sm text-muted-foreground">Hai ancora una domanda? I nostri aiutanti ti rispondono a <a href="mailto:natale@crimonza.org" className="font-semibold text-gold underline">natale@crimonza.org</a>.</p>
  </section>
  <section className="mx-auto mt-20 max-w-4xl px-4 pb-6">
   <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border hairline-gold p-5 text-center sm:flex-row sm:text-left">
    <div><p className="text-xs font-bold uppercase tracking-widest text-gold">Solo per gli organizzatori</p>
     <p className="mt-1 text-sm text-muted-foreground">Le richieste delle famiglie, le squadre e il programma della Vigilia.</p></div>
    <Link to="/babbo-natale/organizzatori" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gold px-5 py-3 text-sm font-semibold text-gold">Area organizzatori <ArrowRight className="h-4 w-4"/></Link>
   </div>
  </section>
 </Shell>;
}
