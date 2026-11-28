import { CAMPAIGN } from "@/lib/campaign";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Gift, HeartHandshake, MapPin, Clock3, Mail, ShieldCheck, Snowflake, ArrowRight, CheckCircle2 } from "lucide-react";
import { Shell } from "@/components/xmas/Shell";
import { AutoSantaScene } from "@/components/xmas/SantaChimney";
import { SANTA_VISIT_SLOTS } from "@/lib/santa-planner";
import { SANTA_CONTRIBUTION_EUR } from "@/lib/santa";

export const Route=createFileRoute("/babbo-natale")({
 staticData:{sitemap:false},
 head:()=>({meta:[
  {title:"Babbo Natale a domicilio · Il Natale che fa bene · CRI Monza"},
  {name:"description",content:"Una visita speciale dei volontari della Croce Rossa di Monza nella notte della Vigilia. Regali già incartati fuori dalla porta. Offerta libera da 30 €."},
  {name:"robots",content:"noindex, nofollow"},
 ]}),
 component:Babbo,
});

/** Safety gate: no customer data is sent, no payment is captured and no
 * booking is created until the number of available teams is approved.
 * This page is a visual and UX preview, NOT an open booking channel.
 */
export const SANTA_PUBLIC_REQUESTS_OPEN=false;
type FamilyPreview={
 nome:string;cognome:string;email:string;telefono:string;
 indirizzo:string;localita:string;numeroBambini:string;
 nomiBambini:string;note:string;slot:string;offerta:string;
};
const blank:FamilyPreview={
 nome:"",cognome:"",email:"",telefono:"",indirizzo:"",localita:"Monza",
 numeroBambini:"1",nomiBambini:"",note:"",slot:"indifferente",offerta:"30",
};
const steps=[
 {icon:Gift,title:"I regali li prepari tu",body:"Incarta i regali e lasciali pronti appena fuori dalla porta, poco prima dell’arrivo. Non occorre portarli in sede."},
 {icon:Snowflake,title:"Bussano Babbo Natale e gli aiutanti",body:"I volontari della Croce Rossa arrivano travestiti da Babbo Natale, elfi e aiutanti, recuperano i pacchi e creano la sorpresa."},
 {icon:HeartHandshake,title:"Una visita da ricordare",body:"Circa mezz’ora con i bambini, la consegna dei regali e la possibilità di una fotografia insieme."},
];
const faq=[
 ["Devo portare i regali in sede?","No. I regali devono essere già incartati e pronti fuori dalla porta poco prima della visita. La squadra li raccoglierà prima di bussare."],
 ["La richiesta è una prenotazione confermata?","No. Le fasce orarie dipendono dal numero di squadre disponibili e dai percorsi. Riceverai una conferma separata solo quando gli organizzatori avranno verificato la disponibilità."],
 ["Quanto costa?","È un’offerta libera a partire da 30 € per la visita. L’importo minimo è provvisorio e potrà essere aggiornato prima dell’apertura delle richieste."],
 ["A che ora passa Babbo Natale?","Per organizzare i giri stiamo considerando quattro fasce: 19:30, 20:30, 21:30 e 22:30. L’orario definitivo sarà comunicato dagli organizzatori."],
];
const inputClass="mt-2 w-full rounded-2xl border border-border bg-background/85 px-4 py-3 text-base text-foreground outline-offset-2 focus:outline focus:outline-gold";
function Babbo(){
 const [form,setForm]=useState<FamilyPreview>(blank);
 const [phase,setPhase]=useState<"form"|"review"|"done">("form");
 const [error,setError]=useState("");
 const set=(field:keyof FamilyPreview,value:string)=>{setForm(p=>({...p,[field]:value}));setError("");};
 const amount=Number(form.offerta.replace(",","."));
 const preview=(event:FormEvent)=>{
  event.preventDefault();
  if(!form.nome.trim()||!form.cognome.trim()||!form.email.includes("@")||!form.telefono.trim()||!form.indirizzo.trim()||!form.nomiBambini.trim()){
   setError("Completa i dati richiesti, compresi i nomi dei bambini.");return;
  }
  if(!Number.isFinite(amount)||amount<SANTA_CONTRIBUTION_EUR||amount>1000){
   setError("Inserisci un'offerta di almeno 30 €, massimo 1.000 €.");return;
  }
  if(Number(form.numeroBambini)<1||Number(form.numeroBambini)>8){
   setError("Il numero di bambini deve essere compreso tra uno e otto.");return;
  }
  setPhase("review");document.getElementById("richiesta")?.scrollIntoView({behavior:"smooth"});
 };
 const finish=()=>{setPhase("done");document.getElementById("richiesta")?.scrollIntoView({behavior:"smooth"});};
 return <Shell hidePiazzaPill>
  <div className="mx-auto max-w-6xl px-4 pt-6">
   <div className="rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-accent-foreground">🤫 Per i grandi: meglio tenere segreta questa pagina ai bambini.</div>
  </div>
  <section className="mx-auto grid max-w-6xl items-end gap-8 px-4 pt-9 md:grid-cols-[1.05fr_1fr]">
   <div className="pb-5">
    <p className="text-xs font-semibold uppercase tracking-[.24em] text-gold">La Vigilia · 24 dicembre · Monza</p>
    <h1 className="mt-4 font-display text-5xl leading-[1.02] sm:text-7xl">Questa volta, Babbo Natale <em className="not-italic text-gold">bussa davvero.</em></h1>
    <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground/85">La magia arriva sulla soglia di casa. I volontari di Croce Rossa Italiana – Comitato di Monza, vestiti da Babbo Natale e aiutanti, consegnano ai bambini i regali che la tua famiglia ha già preparato.</p>
    <div className="mt-7 flex flex-wrap gap-3">
     <a href="#come-funziona" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground">Scopri come funziona <ArrowRight className="h-4 w-4"/></a>
     <a href="#richiesta" className="inline-flex items-center gap-2 rounded-full border hairline-gold px-6 py-3.5 text-sm font-semibold text-gold">Anteprima richiesta</a>
    </div>
    <p className="mt-4 text-xs text-muted-foreground">Il servizio è in preparazione: non stiamo ancora accettando richieste effettive.</p>
   </div>
   <div className="santa-stage overflow-hidden rounded-[2rem] shadow-deep">
    <AutoSantaScene mode="full" className="mx-auto h-[48svh] max-h-[500px] w-full"/>
   </div>
  </section>
  <section id="come-funziona" className="mx-auto mt-16 max-w-6xl scroll-mt-24 px-4">
   <div className="text-center"><p className="text-xs font-semibold uppercase tracking-widest text-gold">Un piccolo segreto fra grandi</p><h2 className="mt-2 font-display text-4xl">Come funziona la sorpresa</h2></div>
   <div className="mt-8 grid gap-4 md:grid-cols-3">
    {steps.map((step,i)=><article key={step.title} className="glass rounded-[1.75rem] p-6">
     <div className="mb-4 flex items-center justify-between"><step.icon className="h-8 w-8 text-gold"/><span className="font-display text-3xl text-gold/65">0{i+1}</span></div>
     <h3 className="font-display text-2xl">{step.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
    </article>)}
   </div>
  </section>
  <section className="mx-auto mt-12 max-w-6xl px-4">
   <div className="grid gap-6 rounded-[2rem] border hairline-gold bg-burgundy p-6 sm:grid-cols-[1fr_1.1fr] sm:p-9">
    <div><p className="text-xs uppercase tracking-widest text-gold">Un gesto che fa bene</p><h2 className="mt-2 font-display text-4xl">Offerta libera <span className="text-gold">da 30 €</span></h2>
     <p className="mt-3 text-sm text-foreground/80">Puoi scegliere liberamente un importo pari o superiore a 30 €. La soglia è provvisoria, in attesa di conferma da parte degli organizzatori.</p></div>
    <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
     <p className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-gold"/>Quattro fasce proposte: 19:30, 20:30, 21:30 e 22:30. Ogni squadra può effettuare fino a quattro visite, compatibilmente con gli spostamenti.</p>
     <p className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold"/>Gli orari e le zone coperte saranno definiti quando sapremo quante squadre di volontari saranno disponibili.</p>
     <p className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold"/>Una richiesta non equivale a una visita confermata. Nessun pagamento viene richiesto in questa anteprima.</p>
    </div>
   </div>
  </section>
  <section id="richiesta" className="mx-auto mt-16 max-w-3xl scroll-mt-28 px-4">
   <div className="text-center"><p className="text-xs uppercase tracking-widest text-gold">La visita di Babbo Natale</p>
    <h2 className="mt-2 font-display text-4xl">Richiedi la tua sorpresa</h2>
    <p className="mt-3 text-sm text-muted-foreground">Il modulo qui sotto è un’anteprima interattiva: puoi provarlo, ma <strong>non invia e non salva richieste</strong>. Apriremo le adesioni dopo la conferma delle squadre.</p>
   </div>
   <div className="mt-7 rounded-2xl border border-gold/60 bg-gold/10 px-5 py-4 text-sm"><strong>Richieste non ancora aperte.</strong> Nessuna richiesta viene registrata, nessuna email parte e non si incassa alcuna donazione.</div>
   {phase==="form"&&<form onSubmit={preview} className="glass-strong mt-5 space-y-5 rounded-[2rem] p-5 sm:p-8" noValidate>
    <div className="grid gap-4 sm:grid-cols-2">
     {([["nome","Nome"],["cognome","Cognome"],["email","Indirizzo email"],["telefono","Telefono"]] as const).map(([key,label])=>
      <label key={key} className="text-sm font-semibold">{label} *<input className={inputClass} type={key==="email"?"email":key==="telefono"?"tel":"text"} value={form[key]} maxLength={120} onChange={e=>set(key,e.target.value)} autoComplete="off" required/></label>)}
    </div>
    <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
     <label className="text-sm font-semibold">Indirizzo con numero civico *<input className={inputClass} value={form.indirizzo} maxLength={180} onChange={e=>set("indirizzo",e.target.value)} placeholder="Via e numero civico" required/></label>
     <label className="text-sm font-semibold">Comune *<input className={inputClass} value={form.localita} onChange={e=>set("localita",e.target.value)} maxLength={80} required/></label>
    </div>
    <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
     <label className="text-sm font-semibold">Quanti bambini? *<input className={inputClass} type="number" min="1" max="8" value={form.numeroBambini} onChange={e=>set("numeroBambini",e.target.value)}/></label>
     <label className="text-sm font-semibold">Nomi dei bambini *<input className={inputClass} value={form.nomiBambini} maxLength={200} onChange={e=>set("nomiBambini",e.target.value)} placeholder="Per esempio: Anna, Luca"/></label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
     <label className="text-sm font-semibold">Fascia oraria preferita<select className={inputClass} value={form.slot} onChange={e=>set("slot",e.target.value)}>
      <option value="indifferente">Indifferente</option>{SANTA_VISIT_SLOTS.map(slot=><option key={slot} value={slot}>{slot}</option>)}
     </select></label>
     <label className="text-sm font-semibold">Offerta libera (€) *<input className={inputClass} type="number" min="30" max="1000" step="1" value={form.offerta} onChange={e=>set("offerta",e.target.value)}/></label>
    </div>
    <label className="block text-sm font-semibold">Una cosa che Babbo Natale dovrebbe sapere (facoltativa)
     <textarea className={inputClass} rows={3} maxLength={500} value={form.note} onChange={e=>set("note",e.target.value)} placeholder="Un episodio divertente, una passione, un dettaglio per rendere speciale la visita. Evita informazioni sanitarie."/></label>
    {error&&<p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-500">{error}</p>}
    <button type="submit" className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground">Prova il riepilogo (non invia nulla)</button>
   </form>}
   {phase==="review"&&<div className="glass-strong mt-5 rounded-[2rem] p-6 sm:p-8">
    <p className="text-xs font-bold uppercase tracking-widest text-gold">Riepilogo simulato · nessuna richiesta registrata</p>
    <h3 className="mt-3 font-display text-3xl">Famiglia {form.cognome}</h3>
    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
     {([["Referente",form.nome+" "+form.cognome],["Email",form.email],["Telefono",form.telefono],
      ["Domicilio",form.indirizzo+", "+form.localita],["Bambini",form.nomiBambini],
      ["Orario preferito",form.slot],["Offerta proposta",amount.toFixed(2)+" €"],["Note",form.note||"—"]] as const).map(([k,v])=>
      <div key={k}><dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>)}
    </dl>
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
     <button type="button" onClick={()=>setPhase("form")} className="rounded-full border hairline-gold px-5 py-3 font-semibold">Modifica</button>
     <button type="button" onClick={finish} className="rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground">Termina simulazione</button>
    </div>
   </div>}
   {phase==="done"&&<div className="glass-strong mt-5 rounded-[2rem] p-8 text-center">
    <CheckCircle2 className="mx-auto h-10 w-10 text-gold"/><h3 className="mt-3 font-display text-3xl">La prova è terminata!</h3>
    <p className="mt-3 text-muted-foreground">Nessuna prenotazione è stata creata, nessuna email inviata e nessuna offerta incassata. Quando apriremo le richieste riceverai un messaggio che conferma soltanto la ricezione, non la visita.</p>
    <button type="button" onClick={()=>{setForm(blank);setPhase("form");}} className="mt-6 rounded-full border hairline-gold px-6 py-3">Riprova</button>
   </div>}
  </section>
  <section className="mx-auto mt-20 max-w-4xl px-4" id="faq">
   <p className="text-center text-xs uppercase tracking-widest text-gold">Tutto quello che serve sapere</p><h2 className="mt-2 text-center font-display text-4xl">Domande frequenti</h2>
   <div className="mt-6 space-y-3">{faq.map(([q,a])=><details key={q} className="glass rounded-2xl px-5 py-4">
    <summary className="cursor-pointer font-semibold">{q}</summary><p className="pt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
   </details>)}</div>
   <p className="mt-7 text-center text-sm text-muted-foreground">Hai un dubbio? Scrivi agli aiutanti di Babbo Natale: <a href="mailto:natale@crimonza.org" className="font-semibold text-gold underline">natale@crimonza.org</a>.</p>
  </section>
  <section className="mx-auto mt-20 max-w-4xl px-4 pb-6">
   <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border hairline-gold p-5 text-center sm:flex-row sm:text-left">
    <div><p className="text-xs font-bold uppercase tracking-widest text-gold">Solo per gli organizzatori</p><p className="mt-1 text-sm text-muted-foreground">Gestione richieste, squadre, percorsi ed esportazione Excel.</p></div>
    <Link to="/babbo-natale/organizzatori" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gold px-5 py-3 text-sm font-semibold text-gold">Area organizzatori <ArrowRight className="h-4 w-4"/></Link>
   </div>
  </section>
 </Shell>;
}
