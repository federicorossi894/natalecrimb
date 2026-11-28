import {createFileRoute,Link} from '@tanstack/react-router';
import {useServerFn} from '@tanstack/react-start';
import {useEffect,useState} from 'react';
import {CreditCard,Heart,LockKeyhole,Mail,CheckCircle2,Clock3,ShieldCheck} from 'lucide-react';
import {Shell} from '@/components/xmas/Shell';
import {santaPaymentDetails,santaStartCheckout,santaCheckCheckout} from '@/lib/santa-payment.functions';
export const Route=createFileRoute('/babbo-natale/pagamento')({
 staticData:{sitemap:false},
 validateSearch:(search:Record<string,unknown>)=>({
  token:typeof search['token']==='string'?search['token']:'',
  ritorno:search['ritorno']==='1',
 }),
 head:()=>({meta:[
  {title:'Contributo Babbo Natale · Croce Rossa Monza'},
  {name:'robots',content:'noindex,nofollow,noarchive'},
  {name:'referrer',content:'no-referrer'},
 ]}),
 component:Pagamento,
});
type Details={nome:string;amountCents:number;paidCents:number;time:string;
 state:string;mode:'demo'|'live';onlineEnabled:boolean};
const money=(c:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(c/100);
function Pagamento(){
 const {token,ritorno}=Route.useSearch();
 const get=useServerFn(santaPaymentDetails),start=useServerFn(santaStartCheckout),check=useServerFn(santaCheckCheckout);
 const [info,setInfo]=useState<Details|null>(null),[error,setError]=useState(''),
 [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;
  get({data:{token}}).then(async d=>{
   if(!alive)return;
   setInfo(d);setLoading(false);
   if(ritorno&&d.mode==='live'&&d.onlineEnabled){
    const verified=await check({data:{token,capture:true}});
    if(alive)setInfo({...d,state:verified.state});
   }
  }).catch(()=>{if(alive){setError('Non riusciamo a trovare questa richiesta. Contatta gli aiutanti di Babbo Natale.');setLoading(false);}});
  return()=>{alive=false;};
 },[token,ritorno,get,check]);
 const pay=async(provider:'paypal'|'sumup')=>{
  if(busy||!info?.onlineEnabled)return;
  setBusy(true);setError('');
  try{const r=await start({data:{token,provider}});window.location.assign(r.url);}
  catch(e){setError(e instanceof Error?e.message:'Pagamento non disponibile.');setBusy(false);}
 };
 const paid=info?.state==='pagato_online'||info?.state==='pagato_bonifico';
 return <Shell hidePiazzaPill>
  <section className="mx-auto max-w-2xl px-4 pb-24 pt-10">
   <Link to="/babbo-natale" className="text-sm text-gold underline">← Babbo Natale a domicilio</Link>
   {info?.mode==='demo'&&<div className="mt-6 rounded-2xl border border-gold bg-gold/15 px-4 py-3 text-center text-sm font-bold tracking-widest">DEMO</div>}
   <div className="glass-strong mt-7 overflow-hidden rounded-[2rem] shadow-deep">
    <div className="bg-burgundy px-6 py-9 text-center sm:px-10">
     <Heart className="mx-auto h-9 w-9 text-gold"/>
     <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gold">Il Natale che fa bene</p>
     <h1 className="mt-2 font-display text-4xl">Un piccolo gesto, una grande magia.</h1>
     <p className="mt-3 text-sm text-foreground/80">Completa il contributo per la visita di Babbo Natale.</p>
    </div>
    <div className="space-y-6 p-6 sm:p-9">
     {loading&&<p>Recupero i dettagli della tua visita…</p>}
     {error&&<p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm">{error}</p>}
     {info&&<>
      <div className="rounded-2xl border border-gold/30 bg-gold/10 p-5 text-center">
       <p className="text-xs uppercase tracking-wider text-muted-foreground">La visita di {info.nome} · 24 dicembre · ore {info.time}</p>
       <p className="mt-2 font-display text-4xl tabular-nums">{money(info.amountCents)}</p>
       <p className="mt-1 text-xs text-muted-foreground">Offerta concordata, a sostegno delle attività CRI Monza</p>
      </div>
      {paid?<div className="flex items-center gap-3 rounded-2xl bg-green-500/10 p-5 text-sm">
       <CheckCircle2 className="h-7 w-7 text-green-600"/><strong>Contributo ricevuto. Grazie per il tuo sostegno!</strong>
      </div>:<>
       <h2 className="font-display text-2xl">Scegli come completare il contributo</h2>
       <div className="space-y-3">
        <button type="button" disabled={!info.onlineEnabled||busy} onClick={()=>void pay('sumup')}
         className="flex w-full items-center gap-3 rounded-2xl border border-gold/40 bg-primary px-5 py-4 text-left font-semibold text-primary-foreground disabled:opacity-60">
         <CreditCard className="h-6 w-6 shrink-0"/><span className="flex-1">Carta di credito o debito
          <small className="mt-1 block text-xs font-normal opacity-80">Apple Pay e Google Pay, se disponibili nel checkout</small></span>
         <LockKeyhole className="h-5 w-5"/>
        </button>
        <button type="button" disabled={!info.onlineEnabled||busy} onClick={()=>void pay('paypal')}
         className="flex w-full items-center gap-3 rounded-2xl border border-gold/40 bg-background px-5 py-4 text-left font-semibold disabled:opacity-60">
         <Heart className="h-6 w-6 shrink-0 text-gold"/><span className="flex-1">Paga con PayPal
          <small className="mt-1 block text-xs font-normal text-muted-foreground">Pagamento online protetto</small></span>
        </button>
       </div>
       <div className="rounded-2xl border border-border p-5">
        <h3 className="flex items-center gap-2 font-semibold"><Mail className="h-5 w-5 text-gold"/> Preferisci il bonifico?</h3>
        <p className="mt-2 text-sm text-muted-foreground">Scrivici e ti invieremo le coordinate e la causale corretta.</p>
        <a href="mailto:natale@crimonza.org?subject=Bonifico%20Babbo%20Natale" className="mt-3 inline-block text-sm font-semibold text-gold underline">Richiedi le coordinate bancarie</a>
       </div>
       {!info.onlineEnabled&&<p className="rounded-xl border border-gold/40 p-4 text-sm">
        {info.mode==='demo'
         ?'Il checkout è visibile per il collaudo, ma non effettua addebiti.'
         :'I pagamenti online saranno disponibili dopo la verifica finale del servizio. Per informazioni scrivici a natale@crimonza.org.'}
       </p>}
       {info.state==='in_verifica'&&<div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock3 className="h-5 w-5"/> Un pagamento potrebbe essere in verifica: non effettuarne un secondo.</div>}
       </>}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
       <ShieldCheck className="h-5 w-5 text-gold"/> Nessun numero di carta viene raccolto dal sito di Croce Rossa Monza.
      </div>
     </>}
    </div>
   </div>
  </section>
 </Shell>;
}
