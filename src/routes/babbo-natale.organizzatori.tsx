import {createFileRoute,Link} from '@tanstack/react-router';
import {useServerFn} from '@tanstack/react-start';
import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {Download,LockKeyhole,LogOut,MapPinned,Users,Gift,Euro,RefreshCw,Pencil,Route as RouteIcon} from 'lucide-react';
import {Shell} from '@/components/xmas/Shell';
import {SantaRouteMap} from '@/components/xmas/SantaRouteMap';
import {SANTA_DEMO_BOOKINGS,SANTA_VISIT_SLOTS,suggestSantaTeams,mapsRouteUrl,type SantaBooking,type SantaStatus,type SantaSlot} from '@/lib/santa-planner';
import {santaXlsx} from '@/lib/santa-xlsx';
import {santaAdminLogin,santaAdminMe,santaAdminLogout,santaAdminList,santaAdminUpdate} from '@/lib/santa-admin.functions';

export const Route=createFileRoute('/babbo-natale/organizzatori')({
 staticData:{sitemap:false},
 head:()=>({meta:[{title:'Area organizzatori · Babbo Natale · CRI Monza'},
  {name:'robots',content:'noindex, nofollow, noarchive'},{name:'referrer',content:'no-referrer'}]}),
 component:Organizzatori,
});
const euro=(c:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(c/100);
const field='mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm';
type LoginState='loading'|'out'|'in';
function Organizzatori(){
 const me=useServerFn(santaAdminMe);
 const login=useServerFn(santaAdminLogin);
 const logout=useServerFn(santaAdminLogout);
 const list=useServerFn(santaAdminList);
 const update=useServerFn(santaAdminUpdate);
 const [auth,setAuth]=useState<LoginState>('loading');
 const [user,setUser]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [records,setRecords]=useState<SantaBooking[]>([]);
 const [examples,setExamples]=useState<SantaBooking[]>(SANTA_DEMO_BOOKINGS);
 const [showExamples,setShowExamples]=useState(true);
 const [editId,setEditId]=useState<string|null>(null);
 const [edit,setEdit]=useState<SantaBooking|null>(null);
 const [message,setMessage]=useState('');
 useEffect(()=>{let active=true;me().then(r=>{
  if(!active)return;
  if(r?.email){setAuth('in');setUser(r.email);}else setAuth('out');
 }).catch(()=>active&&setAuth('out'));return()=>{active=false;};},[me]);
 const refresh=async()=>{
  try{
   const rows=await list();
   setRecords(rows);
   if(rows.length)setShowExamples(false);
  }catch{setError('L’elenco reale non è disponibile. Verifica la sessione.');}
 };
 useEffect(()=>{if(auth==='in')void refresh();},[auth]);
 const submit=async(event:FormEvent)=>{
  event.preventDefault();setBusy(true);setError('');
  try{
   const r=await login({data:{email,password}});
   setPassword('');
   if(!r.ok){setError(r.error);return;}
   setUser(r.email);setAuth('in');
  }catch{setError('Accesso temporaneamente non disponibile.');}
  finally{setBusy(false);}
 };
 const quit=async()=>{
  await logout();setAuth('out');setUser('');setRecords([]);setEdit(null);setEditId(null);
 };
 const bookings=showExamples?examples:records;
 const plan=useMemo(()=>suggestSantaTeams(bookings),[bookings]);
 const paid=bookings.reduce((n,b)=>n+b.quotaIncassataCents,0);
 const offered=bookings.reduce((n,b)=>n+b.quotaOffertaCents,0);
 const exportFile=()=>{
  const bytes=santaXlsx(bookings,plan.teams);
  const content=new Blob([new Uint8Array(bytes)],{
   type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(content);
  const a=document.createElement('a');a.href=url;a.download='Babbo_Natale_CRI_Monza_24-12-2026.xlsx';
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),2000);
 };
 const startEdit=(b:SantaBooking)=>{setEditId(b.id);setEdit({...b,bambini:[...b.bambini]});setMessage('');};
 const save=async()=>{
  if(!edit)return;
  setBusy(true);setMessage('');
  try{
   if(showExamples){
    setExamples(prev=>prev.map(b=>b.id===edit.id?edit:b));
    setMessage('Modifica applicata allo scenario di esempio. Non viene salvata nel database.');
   }else{
    const saved=await update({data:{id:edit.id,patch:{
     nome:edit.nome,cognome:edit.cognome,email:edit.email,telefono:edit.telefono,
     indirizzo:edit.indirizzo,localita:edit.localita,bambini:edit.bambini,
     note:edit.note,quotaOffertaCents:edit.quotaOffertaCents,
     quotaIncassataCents:edit.quotaIncassataCents,
     slotPreferito:edit.slotPreferito,slotAssegnato:edit.slotAssegnato,
     squadra:edit.squadra,status:edit.status,lat:edit.lat,lon:edit.lon,
    }}});
    setRecords(prev=>prev.map(b=>b.id===edit.id?saved:b));
    setMessage('Richiesta aggiornata.');
   }
   setEditId(null);setEdit(null);
  }catch(err){setMessage(err instanceof Error?err.message:'Salvataggio non riuscito.');}
  finally{setBusy(false);}
 };
 const setEditProp=<K extends keyof SantaBooking>(key:K,value:SantaBooking[K])=>
  setEdit(prev=>prev?{...prev,[key]:value}:prev);
 return <Shell hidePiazzaPill>
  <section className="mx-auto max-w-6xl px-4 pb-6 pt-10">
   <Link to="/babbo-natale" className="text-sm text-gold underline">← Torna a Babbo Natale</Link>
   <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-gold">Accesso riservato · Croce Rossa Monza</p>
   <h1 className="mt-2 font-display text-4xl sm:text-6xl">La regia della Vigilia</h1>
   <p className="mt-3 max-w-2xl text-muted-foreground">Richieste delle famiglie, donazioni, squadre e percorsi: tutto in un’unica postazione per gli aiutanti di Babbo Natale.</p>
  </section>
  {auth==='loading'&&<div className="mx-auto max-w-lg px-4 py-12">Verifica della sessione…</div>}
  {auth==='out'&&<section className="mx-auto max-w-lg px-4 pb-20">
   <form onSubmit={submit} className="glass-strong space-y-5 rounded-[2rem] p-6 sm:p-8">
    <LockKeyhole className="h-9 w-9 text-gold"/>
    <h2 className="font-display text-3xl">Accesso organizzatori</h2>
    <p className="text-sm text-muted-foreground">Solo gli indirizzi email autorizzati possono accedere. Le informazioni sulle famiglie e sui bambini sono riservate.</p>
    <label className="block text-sm font-semibold">Email autorizzata<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className={field}/></label>
    <label className="block text-sm font-semibold">Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className={field}/></label>
    {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}
    <button type="submit" disabled={busy} className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-40">Accedi</button>
    <p className="text-xs text-muted-foreground">Se devi essere abilitato, contatta la direzione del servizio. Non è prevista registrazione libera.</p>
   </form>
  </section>}
  {auth==='in'&&<section className="mx-auto max-w-6xl space-y-8 px-4 pb-24">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-sm">
    <span>Accesso: <strong>{user}</strong></span>
    <div className="flex gap-2">
     <button onClick={()=>void refresh()} className="inline-flex items-center gap-1 rounded-full border px-4 py-2"><RefreshCw className="h-4 w-4"/> Aggiorna</button>
     <button onClick={()=>void quit()} className="inline-flex items-center gap-1 rounded-full border px-4 py-2"><LogOut className="h-4 w-4"/> Esci</button>
    </div>
   </div>
   <div className="rounded-2xl border border-gold/50 bg-gold/10 p-4 text-sm">
    <strong>Richieste online non ancora aperte.</strong> Il numero di squadre deve essere concordato prima di accettare prenotazioni. L’ottimizzazione è una proposta modificabile, non una conferma automatica.
   </div>
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="font-display text-3xl">Organizzazione visite</h2>
     <p className="text-sm text-muted-foreground">{showExamples?'Scenario di esempio: famiglie e indirizzi fittizi.':'Dati riservati registrati dagli organizzatori.'}</p></div>
    <div className="flex flex-wrap gap-2">
     <button onClick={()=>{setShowExamples(true);setEditId(null);}} aria-pressed={showExamples}
      className={'rounded-full border px-4 py-2 text-sm '+(showExamples?'bg-secondary font-bold':'')}>Scenario di esempio</button>
     <button onClick={()=>{setShowExamples(false);setEditId(null);}} aria-pressed={!showExamples}
      className={'rounded-full border px-4 py-2 text-sm '+(!showExamples?'bg-secondary font-bold':'')}>Richieste reali ({records.length})</button>
     <button onClick={exportFile} disabled={!bookings.length}
      className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"><Download className="h-4 w-4"/> Scarica Excel</button>
    </div>
   </div>
   <div className="grid gap-3 sm:grid-cols-4">
    {[
     {icon:Users,label:'Richieste',value:String(bookings.length)},
     {icon:Gift,label:'Offerte indicate',value:euro(offered)},
     {icon:Euro,label:'Donazioni ricevute',value:euro(paid)},
     {icon:RouteIcon,label:'Squadre suggerite',value:String(plan.teams.length)},
    ].map(k=><article key={k.label} className="glass rounded-2xl p-5">
     <k.icon className="h-5 w-5 text-gold"/><p className="mt-2 font-display text-3xl">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p>
    </article>)}
   </div>
   <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
    <div className="glass rounded-3xl p-4 sm:p-6">
     <h3 className="mb-4 flex items-center gap-2 font-display text-2xl"><MapPinned className="h-6 w-6 text-gold"/> Mappa delle richieste</h3>
     <SantaRouteMap teams={plan.teams}/>
    </div>
    <div className="space-y-4">
     <h3 className="font-display text-2xl">Giri suggeriti · 24 dicembre</h3>
     <p className="text-sm text-muted-foreground">Ogni squadra: fino a quattro slot, 19:30 · 20:30 · 21:30 · 22:30. Circa 30 minuti con i bambini, il resto dedicato agli spostamenti.</p>
     {plan.teams.map(team=><div key={team.id} className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between"><h4 className="font-display text-xl">{team.id}</h4><span className="text-xs text-gold">{team.bookings.length} / 4 visite</span></div>
      <ol className="mt-3 space-y-2">{team.bookings.map(b=><li key={b.id} className="flex gap-3 border-b border-border/60 pb-2 text-sm">
       <strong className="shrink-0 text-gold">{b.slot}</strong><span>{b.nome} {b.cognome}<small className="block text-muted-foreground">{b.indirizzo}</small></span></li>)}</ol>
      <p className="mt-2 text-xs text-muted-foreground">{team.lengthKm.toFixed(1)} km in linea d’aria fra le tappe</p>
      {team.warnings.length>0&&<p className="mt-2 text-xs text-amber-600">{team.warnings.length} preferenze orarie da verificare</p>}
      <a href={mapsRouteUrl(team)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-gold underline">Apri itinerario in Google Maps</a>
     </div>)}
     {!plan.teams.length&&<p className="text-sm text-muted-foreground">Non ci sono ancora visite da organizzare.</p>}
     {plan.warnings.map(w=><p key={w} className="text-xs text-amber-600">{w}</p>)}
    </div>
   </div>
   <section className="glass-strong rounded-3xl p-5 sm:p-7">
    <h3 className="font-display text-3xl">Elenco richieste</h3>
    <p className="mt-2 text-sm text-muted-foreground">Per ogni famiglia trovi telefono, indirizzo, nomi dei bambini, note e donazioni. Puoi modificare le richieste; l’assegnazione alle squadre è sempre soggetta all’approvazione degli organizzatori.</p>
    {message&&<p role="status" className="mt-3 rounded-xl bg-secondary p-3 text-sm">{message}</p>}
    <div className="mt-6 space-y-4">
     {bookings.map(b=><article key={b.id} className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div><h4 className="font-display text-xl">{b.nome} {b.cognome}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{b.indirizzo}, {b.localita} · {b.telefono}</p>
        <p className="mt-1 text-sm">Bambini: <strong>{b.bambini.join(', ')}</strong></p>
        {b.note&&<p className="mt-1 text-sm">Note: {b.note}</p>}
        <p className="mt-2 text-sm">Offerta proposta {euro(b.quotaOffertaCents)} · <strong>ricevuti {euro(b.quotaIncassataCents)}</strong> · {b.status}</p>
       </div>
       <button type="button" onClick={()=>startEdit(b)} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"><Pencil className="h-4 w-4"/> Modifica</button>
      </div>
      {editId===b.id&&edit&&<div className="mt-5 grid gap-4 border-t pt-5">
       <div className="grid gap-3 sm:grid-cols-2">
        {([['nome','Nome'],['cognome','Cognome'],['email','Email'],['telefono','Telefono'],['indirizzo','Indirizzo'],['localita','Comune']] as const).map(([key,label])=>
         <label key={key} className="text-sm font-semibold">{label}<input className={field} value={edit[key]} onChange={e=>setEditProp(key,e.target.value)}/></label>)}
       </div>
       <label className="text-sm font-semibold">Nomi dei bambini (separati da virgola)<input className={field} value={edit.bambini.join(', ')}
        onChange={e=>setEditProp('bambini',e.target.value.split(',').map(x=>x.trim()).filter(Boolean))}/></label>
       <label className="text-sm font-semibold">Note per Babbo Natale<textarea className={field} rows={3} value={edit.note} onChange={e=>setEditProp('note',e.target.value)}/></label>
       <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold">Offerta proposta (€)<input className={field} type="number" min="30" value={edit.quotaOffertaCents/100} onChange={e=>setEditProp('quotaOffertaCents',Math.round(Number(e.target.value)*100))}/></label>
        <label className="text-sm font-semibold">Effettivamente incassati (€)<input className={field} type="number" min="0" value={edit.quotaIncassataCents/100} onChange={e=>setEditProp('quotaIncassataCents',Math.round(Number(e.target.value)*100))}/></label>
        <label className="text-sm font-semibold">Stato<select className={field} value={edit.status} onChange={e=>setEditProp('status',e.target.value as SantaStatus)}>
         {(['richiesta','confermata','completata','annullata'] as const).map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-sm font-semibold">Squadra<input className={field} value={edit.squadra??''} onChange={e=>setEditProp('squadra',e.target.value||null)} placeholder="Squadra A"/></label>
        <label className="text-sm font-semibold">Slot assegnato<select className={field} value={edit.slotAssegnato??''} onChange={e=>setEditProp('slotAssegnato',e.target.value as SantaSlot||null)}>
         <option value="">Non assegnato</option>{SANTA_VISIT_SLOTS.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-sm font-semibold">Latitudine<input className={field} type="number" step="0.000001" value={edit.lat??''} onChange={e=>setEditProp('lat',e.target.value===''?null:Number(e.target.value))}/></label>
        <label className="text-sm font-semibold">Longitudine<input className={field} type="number" step="0.000001" value={edit.lon??''} onChange={e=>setEditProp('lon',e.target.value===''?null:Number(e.target.value))}/></label>
       </div>
       <div className="flex gap-3"><button disabled={busy} onClick={()=>void save()} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Salva modifiche</button>
        <button onClick={()=>{setEditId(null);setEdit(null);}} className="rounded-full border px-6 py-3 text-sm">Annulla</button></div>
      </div>}
     </article>)}
     {!bookings.length&&<p className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">Nessuna richiesta registrata. Le prenotazioni pubbliche sono ancora chiuse.</p>}
    </div>
   </section>
  </section>}
 </Shell>;
}
