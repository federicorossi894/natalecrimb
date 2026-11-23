import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Minus, Plus, RotateCcw, WifiOff, LockKeyhole, Mail } from 'lucide-react';
import { casettaState, casettaRecordSale, type CasettaCatalog } from '@/lib/casetta-cassa.functions';

export const Route=createFileRoute('/cassa')({
  staticData:{sitemap:false},
  head:()=>({meta:[
    {title:'Cassa della Casetta | Croce Rossa Italiana – Monza'},
    {name:'robots',content:'noindex, nofollow, noarchive'},
    {name:'referrer',content:'no-referrer'},
  ]}),
  component:CasettaCassa,
});
const euro=(c:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(c/100);
type Phase='cart'|'review'|'sending'|'success';
type Method='cash'|'pos';
// Customer emails are suspended. Keep form and receipt code ready for reactivation.
const CUSTOMER_EMAIL_ENABLED=false;
/** Parse Italian money as decimal euros, converting to integer cents.
 * Never use binary floating-point arithmetic for the amount collected. */
function donationEuroCents(input:string):number|null {
  const normalized=input.trim().replace(',','.');
  if(!/^\d{1,4}(\.\d{1,2})?$/.test(normalized))return null;
  const [euro,decimal='']=normalized.split('.');
  const cents=Number(euro)*100+Number(decimal.padEnd(2,'0'));
  return Number.isSafeInteger(cents)&&cents>0&&cents<=100000?cents:null;
}
const big='min-h-16 rounded-2xl px-5 py-4 text-xl font-extrabold shadow-sm transition active:scale-[.98] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-40';
function deviceId(){
  const key='cri-casetta-device-v1';
  let value=localStorage.getItem(key);
  if(!value){value=crypto.randomUUID();localStorage.setItem(key,value);}
  return value;
}
function CasettaCassa(){
  const load=useServerFn(casettaState);
  const save=useServerFn(casettaRecordSale);
  const [catalog,setCatalog]=useState<CasettaCatalog|null>(null);
  const [loading,setLoading]=useState(true);
  const [online,setOnline]=useState(true);
  const [error,setError]=useState('');
  const [qty,setQty]=useState<Record<string,number>>({});
  const [method,setMethod]=useState<Method|null>(null);
  const [wantsExtraDonation,setWantsExtraDonation]=useState(false);
  const [extraDonationEuro,setExtraDonationEuro]=useState('');
  const [firstName,setFirstName]=useState('');
  const [lastName,setLastName]=useState('');
  const [wantsEmail,setWantsEmail]=useState(false);
  const [email,setEmail]=useState('');
  const [phase,setPhase]=useState<Phase>('cart');
  const [requestId,setRequestId]=useState('');
  const [result,setResult]=useState<{totalCents:number;productsCents:number;extraDonationCents:number;mode:'test'|'live'}|null>(null);
  useEffect(()=>{
    let active=true;
    const refresh=async()=>{
      try{const state=await load();if(active){setCatalog(state);setError('');}}
      catch{if(active)setError('Il servizio della cassa non risponde. Riprova tra poco.');}
      finally{if(active)setLoading(false);}
    };
    const network=()=>setOnline(navigator.onLine);
    network();void refresh();
    const timer=window.setInterval(()=>{void refresh();},30000);
    window.addEventListener('online',network);window.addEventListener('offline',network);
    return()=>{active=false;window.clearInterval(timer);window.removeEventListener('online',network);window.removeEventListener('offline',network);};
  },[load]);
  const lines=useMemo(()=>catalog?.products.filter(p=>(qty[p.id]??0)>0).map(p=>({...p,quantity:qty[p.id]??0}))??[],[catalog,qty]);
  const count=lines.reduce((n,p)=>n+p.quantity,0);
  const total=lines.reduce((n,p)=>n+p.quantity*p.priceCents,0);
  const enteredDonationCents=wantsExtraDonation?donationEuroCents(extraDonationEuro):0;
  const grandTotal=total+(enteredDonationCents??0);
  // The register is viewable for volunteer training outside opening hours,
  // but only the database and server may authorize a real sale.
  const open=Boolean(catalog?.open&&online);
  const preview=Boolean(catalog&&!catalog.open);
  const canBrowse=Boolean(catalog&&online);
  function adjust(id:string,step:number){
    if(phase!=='cart')return;
    setQty(prev=>({...prev,[id]:Math.max(0,Math.min(99,(prev[id]??0)+step))}));
    setError('');
  }
  function reset(){
    setQty({});setFirstName('');setLastName('');setWantsEmail(false);setEmail('');setMethod(null);setRequestId('');
    setWantsExtraDonation(false);setExtraDonationEuro('');
    setResult(null);setError('');setPhase('cart');
  }
  async function submit(){
    if(!open||!lines.length||phase!=='review')return;
    if(method!=='cash'&&method!=='pos'){
      setError('Seleziona obbligatoriamente il metodo di pagamento: CONTANTI oppure POS.');return;
    }
    if(wantsExtraDonation&&(enteredDonationCents===null||grandTotal>100000)){
      setError('Inserisci una donazione extra valida (es. 5 oppure 5,50). Il totale massimo della vendita è 1.000 €.');return;
    }
    if(!/^[\p{L} '-]{2,80}$/u.test(firstName.trim())||!/^[\p{L} '-]{2,80}$/u.test(lastName.trim())){
      setError('Inserisci nome e cognome del cliente (entrambi obbligatori).');return;
    }
    if(CUSTOMER_EMAIL_ENABLED&&wantsEmail&&!email.trim()){setError('Inserisci l’email richiesta dal cliente oppure togli la spunta.');return;}
    if(CUSTOMER_EMAIL_ENABLED&&wantsEmail&&email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){
      setError('Controlla l’indirizzo email oppure lascialo vuoto.');return;
    }
    const id=requestId||crypto.randomUUID();
    setRequestId(id);setPhase('sending');setError('');
    try{
      const saved=await save({data:{
        requestId:id,deviceId:deviceId(),method,
        extraDonationCents:wantsExtraDonation?(enteredDonationCents??0):0,
        firstName:firstName.trim(),lastName:lastName.trim(),
        items:lines.map(p=>({id:p.id,quantity:p.quantity})),
        email:CUSTOMER_EMAIL_ENABLED&&wantsEmail?email.trim():'',
      }});
      setResult({totalCents:saved.totalCents,productsCents:saved.productsCents,extraDonationCents:saved.extraDonationCents,mode:saved.mode});
      setPhase('success');
    }catch(e){
      setPhase('review');
      setError(e instanceof Error?e.message:'Conferma incerta. Riprova senza creare una nuova vendita.');
    }
  }
  return <main className="min-h-screen bg-[#f5f2e9] px-3 py-5 text-[#173d30] sm:px-6">
    <div className="mx-auto max-w-4xl">
      <header className="rounded-3xl bg-[#173d30] px-5 py-6 text-center text-white shadow-md">
        <div className="text-sm font-bold uppercase tracking-widest text-[#e7d6b4]">Croce Rossa Italiana · Comitato di Monza</div>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">🎄 Cassa della Casetta</h1>
        <p className="mt-2 text-base">Una vendita, pochi tocchi. Nessun accesso richiesto.</p>
      </header>
      {catalog?.mode==='test'&&<div role="status" className="mt-4 rounded-2xl border-2 border-amber-500 bg-amber-100 p-4 text-center text-lg font-black text-amber-950">
        🧪 MODALITÀ DEMO · Ordini di prova, esclusi dagli incassi e dal magazzino. Report delle 19:00 sospesi. Nessuna email al cliente.
      </div>}
      {!online&&<div role="alert" className="mt-4 flex items-center gap-2 rounded-2xl bg-red-100 p-4 text-lg font-bold text-red-900"><WifiOff/> Senza connessione non si possono registrare vendite.</div>}
      {loading&&<p className="p-10 text-center text-2xl">Caricamento cassa…</p>}
      {!loading&&!catalog&&<div role="alert" className="mt-5 rounded-2xl bg-white p-8 text-center">
        <p className="text-xl font-bold">{error||'Cassa temporaneamente non disponibile'}</p>
        <button type="button" onClick={()=>window.location.reload()}
          className={`${big} mt-6 bg-[#236343] text-white`}>RIPROVA A CARICARE</button>
      </div>}
      {catalog&&!catalog.open&&phase!=='success'&&<section className="mt-5 rounded-3xl border-2 border-amber-400 bg-amber-50 p-5 text-center shadow-sm" role="status" data-testid="casetta-readonly-preview">
        <LockKeyhole className="mx-auto mb-4 text-[#236343]" size={64}/>
        <h2 className="text-3xl font-black">Cassa chiusa · Anteprima</h2>
        <p className="mt-3 text-base">Puoi vedere i prodotti, aggiungerli al carrello e consultare il riepilogo per preparare le istruzioni ai volontari.</p>
        <p className="mt-2 text-base font-bold text-amber-950">Nessuna vendita può essere confermata o registrata in anteprima.</p>
        <p className="mt-2 text-base text-[#52665b]">La cassa reale è aperta ogni giorno dalle <strong>09:00 alle 19:00</strong>, ora italiana.</p>
      </section>}
      {catalog&&phase==='cart'&&<>
        <h2 className="my-5 text-center text-2xl font-black">Tocca i prodotti venduti</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {catalog.products.map(p=><div key={p.id} className="flex min-h-52 flex-col justify-between rounded-3xl border-2 border-[#d5dacd] bg-white p-3 shadow-sm">
            <button type="button" disabled={!canBrowse} onClick={()=>adjust(p.id,1)} aria-label={`Aggiungi ${p.label}`}
              className="flex min-h-36 flex-1 flex-col items-center justify-center gap-3 rounded-xl px-1 text-center focus-visible:outline-4 focus-visible:outline-amber-500">
              <span className="text-xl font-extrabold leading-snug sm:text-2xl">{p.label}</span>
              <span className="text-2xl font-black tabular-nums">{euro(p.priceCents)}</span>
            </button>
            <div className="mt-2 flex items-center justify-between gap-1">
              <button disabled={!canBrowse||!qty[p.id]} onClick={()=>adjust(p.id,-1)} aria-label={`Rimuovi uno ${p.label}`}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e9e8e1] disabled:opacity-30"><Minus size={28}/></button>
              <span className="text-2xl font-black tabular-nums">{qty[p.id]??0}</span>
              <button disabled={!canBrowse} onClick={()=>adjust(p.id,1)} aria-label={`Aggiungi uno ${p.label}`}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d4eadb]"><Plus size={28}/></button>
            </div>
          </div>)}
        </div>
        <div className="sticky bottom-2 z-10 mt-5 rounded-3xl border-2 border-[#b5c6b8] bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between gap-3 text-xl"><strong>{count} prodotti</strong><strong className="text-3xl tabular-nums">{euro(total)}</strong></div>
          <button disabled={!canBrowse||!count} onClick={()=>{setPhase('review');setError('');}}
            className={`${big} mt-3 w-full bg-[#236343] text-white`}>RIEPILOGO VENDITA →</button>
        </div>
      </>}
      {catalog&&(phase==='review'||phase==='sending')&&<section className="mt-5 rounded-3xl bg-white p-5 shadow-lg sm:p-8">
        <h2 className="mb-5 text-center text-3xl font-black">Controlla la vendita</h2>
        <div className="space-y-3">{lines.map(p=><div key={p.id} className="flex justify-between gap-3 border-b pb-3 text-lg">
          <span><strong>{p.quantity} ×</strong> {p.label}</span><strong className="whitespace-nowrap">{euro(p.quantity*p.priceCents)}</strong>
        </div>)}</div>
        <div className="mt-5 rounded-2xl border-2 border-[#b7c7b8] bg-[#faf9f4] p-4">
          <h3 className="text-xl font-black">Donazione extra?</h3>
          <p className="mt-1 text-sm text-[#516357]">Il cliente vuole lasciare qualcosa in più rispetto al prezzo dei prodotti?</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button type="button" disabled={phase==='sending'||Boolean(requestId)} aria-pressed={!wantsExtraDonation}
              onClick={()=>{setWantsExtraDonation(false);setExtraDonationEuro('');setError('');}}
              className={`${big} border-2 ${!wantsExtraDonation?'border-[#236343] bg-[#d5eadc]':'border-transparent bg-[#eeeae1]'}`}>NO</button>
            <button type="button" disabled={phase==='sending'||Boolean(requestId)} aria-pressed={wantsExtraDonation}
              onClick={()=>{setWantsExtraDonation(true);setError('');}}
              className={`${big} border-2 ${wantsExtraDonation?'border-[#236343] bg-[#d5eadc]':'border-transparent bg-[#eeeae1]'}`}>SÌ</button>
          </div>
          {wantsExtraDonation&&<label htmlFor="casetta-extra-donation" className="mt-4 block text-lg font-extrabold">
            Importo della donazione extra (€) *
            <input id="casetta-extra-donation" type="text" inputMode="decimal" autoComplete="off"
              placeholder="Es. 6,00" maxLength={7} required
              disabled={phase==='sending'||Boolean(requestId)} value={extraDonationEuro}
              onChange={e=>{setExtraDonationEuro(e.target.value);setError('');}}
              className="mt-2 min-h-16 w-full rounded-2xl border-2 border-[#b7c7b8] bg-white px-4 text-xl font-normal focus:outline-4 focus:outline-amber-500"
              aria-invalid={extraDonationEuro.trim().length>0&&enteredDonationCents===null}/>
            <span className="mt-2 block text-sm font-normal text-[#516357]">Inserisci solo l’importo aggiuntivo, non il totale pagato. Esempio: prodotti 14 €, il cliente lascia 20 € → donazione extra 6 €.</span>
          </label>}
        </div>
        <div className="my-5 space-y-2 border-t-2 pt-4">
          <div className="flex justify-between text-lg"><span>Totale prodotti</span><strong>{euro(total)}</strong></div>
          {wantsExtraDonation&&<div className="flex justify-between text-lg"><span>Donazione extra</span><strong>{enteredDonationCents===null?'Importo non valido':euro(enteredDonationCents)}</strong></div>}
          <div className="flex justify-between gap-2 border-t pt-3 text-3xl font-black"><span>TOTALE DA INCASSARE</span><span className="whitespace-nowrap">{euro(grandTotal)}</span></div>
        </div>
        <h3 className="mb-3 text-center text-xl font-black">Come ha pagato? *</h3>
        <div className="grid grid-cols-2 gap-3">
          <button disabled={phase==='sending'||Boolean(requestId)} aria-pressed={method==='cash'} onClick={()=>{setMethod('cash');setError('');}}
            className={`${big} border-2 ${method==='cash'?'border-[#236343] bg-[#d5eadc]':'border-transparent bg-[#eeeae1]'}`}>💶<span className="block">CONTANTI</span></button>
          <button disabled={phase==='sending'||Boolean(requestId)} aria-pressed={method==='pos'} onClick={()=>{setMethod('pos');setError('');}}
            className={`${big} border-2 ${method==='pos'?'border-[#236343] bg-[#d5eadc]':'border-transparent bg-[#eeeae1]'}`}>💳<span className="block">POS</span></button>
        </div>
        <p className="mt-3 text-center text-base font-semibold text-[#516357]" role="status">
          {method==='pos'?'Incassa prima sul POS fisico, poi conferma.':method==='cash'?'Ricevi prima i contanti, poi conferma.':'Seleziona CONTANTI o POS: il metodo di pagamento è obbligatorio.'}
        </p>
        <div className="mt-6 rounded-2xl border-2 border-[#b7c7b8] bg-[#faf9f4] p-4">
          <h3 className="text-xl font-black">Dati cliente · obbligatori</h3>
          <p className="mt-1 text-sm text-[#516357]">Scrivi nome e cognome come sul blocchetto delle offerte.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label htmlFor="casetta-first-name" className="text-lg font-extrabold">Nome *
              <input id="casetta-first-name" type="text" autoComplete="given-name" maxLength={80} required
                disabled={phase==='sending'||Boolean(requestId)} value={firstName} onChange={e=>setFirstName(e.target.value)}
                placeholder="Nome" className="mt-2 min-h-16 w-full rounded-2xl border-2 border-[#b7c7b8] bg-white px-4 text-xl font-normal focus:outline-4 focus:outline-amber-500"/>
            </label>
            <label htmlFor="casetta-last-name" className="text-lg font-extrabold">Cognome *
              <input id="casetta-last-name" type="text" autoComplete="family-name" maxLength={80} required
                disabled={phase==='sending'||Boolean(requestId)} value={lastName} onChange={e=>setLastName(e.target.value)}
                placeholder="Cognome" className="mt-2 min-h-16 w-full rounded-2xl border-2 border-[#b7c7b8] bg-white px-4 text-xl font-normal focus:outline-4 focus:outline-amber-500"/>
            </label>
          </div>
        </div>
        {CUSTOMER_EMAIL_ENABLED&&<><label className="mt-6 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-[#b7c7b8] bg-white p-4 text-lg font-extrabold">
          <input type="checkbox" checked={wantsEmail} disabled={phase==='sending'||Boolean(requestId)}
            onChange={e=>{setWantsEmail(e.target.checked);if(!e.target.checked)setEmail('');}}
            className="h-7 w-7 shrink-0 accent-[#236343]"/>
          <Mail size={25} className="shrink-0"/> Il cliente desidera ricevere via email la ricevuta NON fiscale e il messaggio di ringraziamento?
        </label>
        {wantsEmail&&<div className="mt-3">
          <label htmlFor="casetta-email" className="text-lg font-extrabold">Email cliente (solo su richiesta)</label>
          <input id="casetta-email" type="email" inputMode="email" autoComplete="email" disabled={phase==='sending'||Boolean(requestId)}
            value={email} onChange={e=>setEmail(e.target.value)} placeholder="nome@email.it"
            className="mt-2 min-h-16 w-full rounded-2xl border-2 border-[#b7c7b8] bg-white px-4 text-lg focus:outline-4 focus:outline-amber-500"/>
          <p className="mt-2 text-sm text-[#516357]">Invieremo la ricevuta NON fiscale con il riepilogo dell’acquisto, un ringraziamento e un invito a visitare il sito di Natale. Nessuna newsletter. In DEMO riceverà una mail di simulazione, non una conferma di acquisto reale.</p>
        </div>}</>}
        {error&&<div role="alert" className="mt-4 rounded-2xl bg-red-100 p-4 text-base font-bold text-red-900">{error}</div>}
        {preview&&<p className="mt-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-center font-extrabold text-amber-950">
          ANTEPRIMA · La conferma è disattivata fuori orario. Nessun pagamento o movimento di magazzino verrà registrato.
        </p>}
        <button disabled={!open||phase==='sending'} onClick={()=>void submit()} className={`${big} mt-5 w-full bg-[#236343] text-white`}>
          {preview?'CONFERMA NON DISPONIBILE IN ANTEPRIMA':phase==='sending'?'REGISTRAZIONE IN CORSO…':requestId?'RIPROVA LA CONFERMA':'CONFERMA VENDITA'}
        </button>
        {!requestId&&<button onClick={()=>setPhase('cart')} className={`${big} mt-3 w-full bg-[#eeeae1]`}>← MODIFICA PRODOTTI</button>}
      </section>}
      {phase==='success'&&<section role="status" className="mt-5 rounded-3xl bg-white p-8 text-center shadow-lg">
        <CheckCircle2 className="mx-auto text-[#236343]" size={80}/>
        <h2 className="mt-4 text-3xl font-black">{result?.mode==='test'?'Vendita di prova registrata!':'Vendita registrata!'}</h2>
        <p className="mt-4 text-4xl font-black">{euro(result?.totalCents??0)}</p>
        {Boolean(result?.extraDonationCents)&&<p className="mt-2 text-base">Prodotti: {euro(result?.productsCents??0)} · Donazione extra: {euro(result?.extraDonationCents??0)}</p>}
        <p className="mt-2 text-lg font-bold">{firstName} {lastName}</p>
        <p className="mt-3 text-lg">Pagamento: {method==='cash'?'Contanti':method==='pos'?'POS':'Non selezionato'}</p>
        {CUSTOMER_EMAIL_ENABLED&&wantsEmail&&email&&<p className="mt-2 text-base">Email di ringraziamento in preparazione (in DEMO sarà indicata chiaramente come simulazione).</p>}
        <button onClick={reset} className={`${big} mt-8 flex w-full items-center justify-center gap-3 bg-[#236343] text-white`}><RotateCcw/> NUOVA VENDITA</button>
      </section>}
      <p className="mt-8 text-center text-sm text-[#596a60]">Vendite in presenza · Non è un registratore fiscale · Orario 09:00–19:00</p>
    </div>
  </main>;
}
