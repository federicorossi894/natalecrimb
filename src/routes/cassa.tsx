import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Minus, Plus, RotateCcw, WifiOff } from 'lucide-react';
import { casettaActivateQr, casettaSession, casettaRecordSale, type CasettaProduct } from '@/lib/casetta-cassa.functions';

export const Route = createFileRoute('/cassa')({
  staticData: { sitemap:false },
  head: () => ({ meta:[
    {title:'Cassa Casetta · Area riservata CRI Monza'},
    {name:'robots',content:'noindex, nofollow, noarchive'},
    {name:'referrer',content:'no-referrer'},
  ]}),
  component: CasettaCassa,
});

const icons: Record<string,string> = {
  panettone:'🎁',pandoro:'🍰',cioccolatini:'🍫',tisane:'🍵',riso:'🍚',
};
const euro = (cents:number) => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(cents/100);
type Method = 'cash' | 'pos';
type Phase = 'cart' | 'review' | 'sending' | 'success';
const btn = 'rounded-2xl border-2 border-transparent px-4 py-5 text-xl font-bold shadow-sm active:scale-[.98] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:opacity-40';
function CasettaCassa() {
  const activate = useServerFn(casettaActivateQr);
  const session = useServerFn(casettaSession);
  const record = useServerFn(casettaRecordSale);
  const [products,setProducts] = useState<CasettaProduct[]>([]);
  const [authorized,setAuthorized] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [qty,setQty] = useState<Record<string,number>>({});
  const [method,setMethod] = useState<Method>('cash');
  const [phase,setPhase] = useState<Phase>('cart');
  const [requestId,setRequestId] = useState('');
  const [confirmedTotal,setConfirmedTotal] = useState(0);
  const [online,setOnline] = useState(true);
  useEffect(()=>{
    let mounted=true;
    setOnline(navigator.onLine);
    const update=()=>setOnline(navigator.onLine);
    window.addEventListener('online',update);window.addEventListener('offline',update);
    const url=new URL(window.location.href);
    const token=url.searchParams.get('access');
    if(token){url.searchParams.delete('access');window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);}
    (async()=>{
      try {
        const response=token?await activate({data:{token}}):await session();
        if(!mounted)return;
        if('ok' in response ? response.ok : response.authorized) {
          setAuthorized(true);setProducts(response.products);
        } else setError('Scansiona il QR autorizzato della casetta per aprire la cassa.');
      } catch {if(mounted)setError('QR non valido o scaduto. Chiedi un nuovo QR al responsabile.');}
      finally {if(mounted)setLoading(false);}
    })();
    return ()=>{mounted=false;window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[activate,session]);
  const lines=useMemo(()=>products.filter(p=>(qty[p.id]??0)>0).map(p=>({...p,quantity:qty[p.id]??0})),[products,qty]);
  const total=lines.reduce((sum,p)=>sum+p.priceCents*p.quantity,0);
  const count=lines.reduce((sum,p)=>sum+p.quantity,0);
  function change(id:string,by:number) {
    if(phase!=='cart')return;
    setQty(old=>({...old,[id]:Math.max(0,Math.min(99,(old[id]??0)+by))}));
    setRequestId('');setError('');
  }
  async function submit(){
    if(!online||!lines.length||phase!=='review')return;
    const id=requestId||crypto.randomUUID();
    setRequestId(id);setPhase('sending');setError('');
    try{
      const result=await record({data:{requestId:id,method,items:lines.map(p=>({id:p.id,quantity:p.quantity}))}});
      setConfirmedTotal(result.totalCents);
      setPhase('success');
    }catch{
      setPhase('review');
      setError('Conferma non verificata. NON registrare una nuova vendita: premi di nuovo «Riprova conferma» per controllare con lo stesso identificativo.');
    }
  }
  function reset(){
    setQty({});setMethod('cash');setRequestId('');setPhase('cart');setError('');
  }
  return <main className="min-h-screen bg-[#f5f2e9] px-3 py-5 text-[#173d30] sm:px-6">
    <div className="mx-auto max-w-3xl">
      <header className="mb-5 rounded-2xl bg-[#173d30] p-5 text-center text-white">
        <div className="text-xs font-bold uppercase tracking-widest text-[#d8c99f]">Croce Rossa Italiana · Comitato di Monza</div>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">🎄 Cassa della Casetta</h1>
        <div className="mt-2 text-base">Vendite in presenza · Non è un pagamento online</div>
      </header>
      {!online&&<div role="alert" className="mb-4 flex items-center gap-3 rounded-xl bg-red-100 p-4 text-lg font-bold text-red-900"><WifiOff/> Connessione assente. Non confermare vendite.</div>}
      {loading&&<p className="p-8 text-center text-xl">Apertura cassa…</p>}
      {!loading&&!authorized&&<section className="rounded-2xl bg-white p-8 text-center text-xl font-bold" role="alert">{error||'Cassa non autorizzata.'}</section>}
      {!loading&&authorized&&products.length===0&&<section className="rounded-2xl bg-white p-8 text-center text-xl font-bold">Il listino non è ancora stato configurato. Nessuna vendita può essere registrata.</section>}
      {!loading&&authorized&&products.length>0&&<>
        {phase==='cart'&&<>
          <h2 className="mb-3 text-center text-2xl font-black">1. Tocca i prodotti venduti</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map(p=><div key={p.id} className="flex min-h-48 flex-col items-center justify-between rounded-2xl border-2 border-[#d8d9cc] bg-white p-3 text-center shadow-sm">
              <button type="button" onClick={()=>change(p.id,1)} aria-label={`Aggiungi ${p.label}`} className="flex w-full flex-1 flex-col items-center justify-center gap-1 rounded-xl focus-visible:outline-4 focus-visible:outline-amber-500">
                <span aria-hidden className="text-5xl">{icons[p.id]||'🎀'}</span>
                <span className="text-lg font-extrabold leading-tight">{p.label}</span>
                <span className="text-xl font-bold">{euro(p.priceCents)}</span>
              </button>
              <div className="mt-2 flex w-full items-center justify-between gap-2">
                <button aria-label={`Togli ${p.label}`} disabled={!qty[p.id]} onClick={()=>change(p.id,-1)} className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e9e7df] disabled:opacity-30"><Minus size={26}/></button>
                <span className="text-2xl font-black tabular-nums">{qty[p.id]??0}</span>
                <button aria-label={`Aggiungi ${p.label}`} onClick={()=>change(p.id,1)} className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d5eadc]"><Plus size={26}/></button>
              </div>
            </div>)}
          </div>
          <section className="sticky bottom-2 mt-5 rounded-2xl border-2 border-[#c5cfbf] bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between text-xl"><strong>{count} prodotti</strong><strong className="text-3xl tabular-nums">{euro(total)}</strong></div>
            <button disabled={!count||!online} onClick={()=>{setPhase('review');setError('');}} className={`${btn} mt-3 w-full bg-[#236343] text-white`}>RIEPILOGO VENDITA →</button>
          </section>
        </>}
        {(phase==='review'||phase==='sending')&&<section className="rounded-2xl bg-white p-5 shadow-lg">
          <h2 className="mb-5 text-center text-3xl font-black">2. Controlla la vendita</h2>
          <div className="space-y-3">{lines.map(p=><div key={p.id} className="flex justify-between border-b pb-2 text-lg"><span><strong>{p.quantity} ×</strong> {p.label}</span><strong>{euro(p.quantity*p.priceCents)}</strong></div>)}</div>
          <div className="my-5 flex justify-between border-t-2 pt-4 text-3xl font-black"><span>TOTALE</span><span>{euro(total)}</span></div>
          <h3 className="mb-2 text-center text-xl font-bold">3. Come ha pagato?</h3>
          <div className="grid grid-cols-2 gap-3">
            <button disabled={phase==='sending'||Boolean(requestId)} aria-pressed={method==='cash'} onClick={()=>setMethod('cash')} className={`${btn} ${method==='cash'?'border-[#236343] bg-[#d5eadc]':'bg-[#eeeae1]'}`}>💶<span className="block">CONTANTI</span></button>
            <button disabled={phase==='sending'||Boolean(requestId)} aria-pressed={method==='pos'} onClick={()=>setMethod('pos')} className={`${btn} ${method==='pos'?'border-[#236343] bg-[#d5eadc]':'bg-[#eeeae1]'}`}>💳<span className="block">POS</span></button>
          </div>
          <p className="my-4 text-center text-base text-[#536258]">{method==='pos'?'Prima incassa sul terminale POS, poi conferma qui.':'Prima ricevi i contanti, poi conferma qui.'}</p>
          {error&&<div role="alert" className="mb-4 rounded-xl bg-red-100 p-4 text-base font-bold text-red-900">{error}</div>}
          <button disabled={phase==='sending'||!online} onClick={submit} className={`${btn} w-full bg-[#236343] text-white`}>{phase==='sending'?'Registrazione in corso…':requestId?'RIPROVA CONFERMA':'CONFERMA VENDITA'}</button>
          {!requestId&&<button onClick={()=>setPhase('cart')} className={`${btn} mt-3 w-full bg-[#eeeae1]`}>← MODIFICA PRODOTTI</button>}
        </section>}
        {phase==='success'&&<section role="status" className="rounded-2xl bg-white p-7 text-center shadow-lg">
          <CheckCircle2 className="mx-auto text-[#236343]" size={76}/>
          <h2 className="my-4 text-3xl font-black">Vendita registrata!</h2>
          <p className="text-4xl font-black">{euro(confirmedTotal)}</p>
          <p className="mt-3 text-lg">Pagamento: {method==='cash'?'Contanti':'POS'}</p>
          <button onClick={reset} className={`${btn} mt-8 flex w-full items-center justify-center gap-3 bg-[#236343] text-white`}><RotateCcw/> NUOVA VENDITA</button>
        </section>}
      </>}
      <p className="mt-7 text-center text-sm text-[#5e6b61]">Area riservata · La vendita è registrata solo dopo la conferma verde.</p>
    </div>
  </main>;
}
