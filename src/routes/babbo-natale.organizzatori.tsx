import {createFileRoute,Link} from '@tanstack/react-router';
import {useServerFn} from '@tanstack/react-start';
import {useEffect,useMemo,useState,type FormEvent, type DragEvent} from 'react';
import {Download,LockKeyhole,LogOut,MapPinned,Users,Gift,Euro,RefreshCw,
 Pencil,ArrowUp,ArrowDown,Check,MapPin,Trash2,ShieldCheck,Clock3,Route as RouteIcon} from 'lucide-react';
import {Shell} from '@/components/xmas/Shell';
import {SantaRouteMap} from '@/components/xmas/SantaRouteMap';
import {SANTA_TEAM_IDS,SANTA_TEAM_COLORS,santaBoard,moveSantaBooking,
 santaBoardPayload,mapsRouteUrl,SANTA_VISIT_TIMES,santaVisitTime,type SantaBooking,type SantaTeamId} from '@/lib/santa-planner';
import {santaXlsx} from '@/lib/santa-xlsx';
import {santaAddress,santaChildrenLines} from '@/lib/santa-family';
import type {SantaChild} from '@/lib/santa-planner';
import {santaAdminLogin,santaAdminMe,santaAdminLogout,santaAdminList,
 santaAdminBoardSave,santaAdminUpdate,santaAdminLocate,santaAdminConfirmPlanning,santaAdminCancelBooking,santaAdminRecordTransfer,santaAdminSyncPayments} from '@/lib/santa-admin.functions';

export const Route=createFileRoute('/babbo-natale/organizzatori')({
 staticData:{sitemap:false},
 head:()=>({meta:[{title:'Area organizzatori · Babbo Natale · CRI Monza'},
  {name:'robots',content:'noindex, nofollow, noarchive'},
  {name:'referrer',content:'no-referrer'}]}),
 component:Organizzatori,
});
const money=(c:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(c/100);
const input='mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm';
type LoginState='loading'|'out'|'in';
function Organizzatori(){
 const me=useServerFn(santaAdminMe),login=useServerFn(santaAdminLogin),
  logout=useServerFn(santaAdminLogout),list=useServerFn(santaAdminList),
  saveBoard=useServerFn(santaAdminBoardSave),update=useServerFn(santaAdminUpdate),
  locate=useServerFn(santaAdminLocate),confirmPlan=useServerFn(santaAdminConfirmPlanning),
  cancelBooking=useServerFn(santaAdminCancelBooking),recordTransfer=useServerFn(santaAdminRecordTransfer),
  syncPayments=useServerFn(santaAdminSyncPayments);
 const [auth,setAuth]=useState<LoginState>('loading');
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [user,setUser]=useState(''),[error,setError]=useState('');
 const [busy,setBusy]=useState(false),[saving,setSaving]=useState(false);
 const [records,setRecords]=useState<SantaBooking[]>([]);
 const [boardVersion,setBoardVersion]=useState(0);
 const [mode,setMode]=useState<'demo'|'live'>('demo');
 const [planningConfirmed,setPlanningConfirmed]=useState(false);
 const [confirmOpen,setConfirmOpen]=useState(false);
 const [message,setMessage]=useState('');
 const [dragId,setDragId]=useState<string|null>(null);
 const [edit,setEdit]=useState<SantaBooking|null>(null);
 useEffect(()=>{let active=true;me().then(result=>{
  if(!active)return;
  if(result?.email){setAuth('in');setUser(result.email);}else setAuth('out');
 }).catch(()=>active&&setAuth('out'));return()=>{active=false;};},[me]);
 const refresh=async()=>{
  try{
   const result=await list();
   setRecords(result.bookings);setBoardVersion(result.version);setMode(result.mode);setPlanningConfirmed(result.planningConfirmed);
   setError('');
  }catch(e){setError(e instanceof Error?e.message:'Impossibile caricare le richieste.');}
 };
 useEffect(()=>{if(auth==='in')void refresh();},[auth]);
 const signIn=async(e:FormEvent)=>{
  e.preventDefault();setBusy(true);setError('');
  try{
   const res=await login({data:{email:email.trim().toLowerCase(),password}});
   setPassword('');
   if(res.ok){setAuth('in');setUser(res.email);}
   else setError(res.error);
  }catch(e){setError(e instanceof Error?e.message:'Accesso non riuscito. Apri la preview direttamente nel browser.');}
  finally{setBusy(false);}
 };
 const quit=async()=>{try{await logout();}finally{setAuth('out');setRecords([]);setUser('');}};
 const board=useMemo(()=>santaBoard(records),[records]);
 const offered=records.filter(b=>b.status!=='annullata').reduce((s,b)=>s+b.quotaOffertaCents,0);
 const paid=records.filter(b=>b.status!=='annullata').reduce((s,b)=>s+b.quotaIncassataCents,0);
 const assigned=board.teams.reduce((s,t)=>s+t.bookings.length,0);
 const active=records.filter(b=>b.status!=='annullata');
 const eligibleForConfirmation=!planningConfirmed&&active.length>0&&board.unassigned.length===0&&
  board.teams.every(t=>t.bookings.length<=4);
 const actuallyPaid=active.filter(b=>b.paymentState==='pagato_online'||b.paymentState==='pagato_bonifico').length;
 const awaitingPayment=active.filter(b=>b.status==='confermata'&&
  b.paymentState!=='pagato_online'&&b.paymentState!=='pagato_bonifico').length;
 const move=async(id:string,to:SantaTeamId|null,index?:number)=>{
  if(saving||planningConfirmed)return;
  const booking=records.find(b=>b.id===id);
  if(!booking)return;
  if(!to&&['confermata','completata'].includes(booking.status)){
   setMessage('Per togliere una visita confermata dalla squadra, modifica prima il suo stato.');
   return;
  }
  const previous=records;
  const next=moveSantaBooking(records,id,to,index);
  if(next===records){setMessage('Ogni squadra ha quattro fasce orarie. Non puoi aggiungere altre visite.');return;}
  setRecords(next);setSaving(true);setMessage('');
  try{
   const saved=await saveBoard({data:{
    version:boardVersion,assignments:santaBoardPayload(next),
   }});
   setBoardVersion(saved.version);setMessage('Disposizione aggiornata.');
  }catch(e){
   setRecords(previous);
   setMessage('La disposizione non è stata salvata: aggiorna e riprova.');
   await refresh();
  }finally{setSaving(false);setDragId(null);}
 };
 const dragStart=(e:DragEvent<HTMLDivElement>,id:string)=>{
  if(saving||planningConfirmed){e.preventDefault();return;}
  e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';setDragId(id);
 };
 const dragOver=(e:DragEvent<HTMLElement>)=>{e.preventDefault();e.dataTransfer.dropEffect='move';};
 const drop=(e:DragEvent<HTMLElement>,to:SantaTeamId|null,at?:number)=>{
  e.preventDefault();e.stopPropagation();
  const id=e.dataTransfer.getData('text/plain')||dragId;
  if(id)void move(id,to,at);
 };
 const exportXlsx=()=>{
  const data=santaXlsx(records,board.teams);
  const file=new Blob([new Uint8Array(data)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(file);const a=document.createElement('a');
  a.href=url;a.download='CRI_Monza_Babbo_Natale_2026.xlsx';
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),2500);
 };
 const change=<K extends keyof SantaBooking>(key:K,value:SantaBooking[K])=>
  setEdit(old=>old?{...old,[key]:value}:old);
 const sendAllConfirmations=async()=>{
  if(!eligibleForConfirmation||busy||saving)return;
  setBusy(true);setError('');setMessage('');
  try{
   const result=await confirmPlan({data:{version:boardVersion}});
   setConfirmOpen(false);await refresh();
   setMessage('Planning confermato: '+result.confirmed+' visite. Email accettate: '+
    result.delivery.accepted+'; non inviate nel collaudo: '+result.delivery.suppressed+
    '; da controllare: '+(result.delivery.failed+result.delivery.uncertain)+'.');
  }catch(e){setError(e instanceof Error?e.message:'Impossibile confermare il planning.');}
  finally{setBusy(false);}
 };
 const removeBooking=async(b:SantaBooking)=>{
  if(planningConfirmed||busy||saving)return;
  if(!window.confirm('Eliminare la richiesta di '+b.nome+' '+b.cognome+'? Verrà conservata nello storico, ma sparirà dal planning.'))return;
  setBusy(true);setMessage('');
  try{await cancelBooking({data:{id:b.id}});await refresh();setMessage('Richiesta eliminata dal planning.');}
  catch(e){setMessage(e instanceof Error?e.message:'Impossibile eliminare la richiesta.');}
  finally{setBusy(false);}
 };
 const confirmBankTransfer=async(b:SantaBooking)=>{
  if(mode!=='live'||b.status!=='confermata'||busy)return;
  if(!window.confirm('Hai verificato che il bonifico della famiglia '+b.cognome+' sia effettivamente accreditato sul conto CRI?'))return;
  const reference=window.prompt('Riferimento del bonifico effettivamente verificato (TRN o causale):');
  if(!reference)return;
  setBusy(true);
  try{await recordTransfer({data:{id:b.id,reference}});await refresh();setMessage('Bonifico verificato e registrato.');}
  catch(e){setMessage(e instanceof Error?e.message:'Bonifico non registrato.');}
  finally{setBusy(false);}
 };
 const verifyPayments=async()=>{
  setBusy(true);
  try{const result=await syncPayments();await refresh();
   setMessage('Controllati '+result.checked+' pagamenti in attesa; verificati '+result.paid+' nuovi incassi.');
  }catch(e){setMessage(e instanceof Error?e.message:'Controllo pagamenti non disponibile.');}
  finally{setBusy(false);}
 };
 const saveDetails=async()=>{
  if(!edit)return;
  setBusy(true);setMessage('');
  try{
   const updated=await update({data:{id:edit.id,patch:{
    nome:edit.nome,cognome:edit.cognome,email:edit.email,telefono:edit.telefono,
    indirizzo:edit.indirizzo,localita:edit.localita,
    piano:edit.piano??undefined,dettagliAccesso:edit.dettagliAccesso??undefined,
    bambini:edit.bambini,bambiniDettagli:edit.bambiniDettagli??undefined,
    note:edit.note,quotaOffertaCents:edit.quotaOffertaCents,
    lat:edit.lat,lon:edit.lon,
   }}});
   setRecords(prev=>prev.map(b=>b.id===updated.id?updated:b));
   setEdit(null);setMessage('Prenotazione aggiornata.');
  }catch(e){setMessage(e instanceof Error?e.message:'Impossibile salvare.');}
  finally{setBusy(false);}
 };
 const updateEditChild=(index:number,key:keyof SantaChild,value:string|number|null)=>{
  setEdit(prev=>{
   if(!prev?.bambiniDettagli)return prev;
   return {...prev,bambiniDettagli:prev.bambiniDettagli.map((c,i)=>
    i===index?{...c,[key]:value}:c)};
  });
 };
 const addEditChild=()=>{
  if(!edit?.bambiniDettagli||edit.bambiniDettagli.length>=8)return;
  change('bambiniDettagli',[...edit.bambiniDettagli,
   {nome:'',cognome:'',soprannome:'',eta:null}]);
 };
 const removeEditChild=(index:number)=>{
  if(!edit?.bambiniDettagli||edit.bambiniDettagli.length<=1)return;
  change('bambiniDettagli',edit.bambiniDettagli.filter((_,i)=>i!==index));
 };
 const locateBooking=async(b:SantaBooking)=>{
  setMessage('Cerco la posizione dell’indirizzo…');setBusy(true);
  try{
   const result=await locate({data:{id:b.id}});
   await refresh();
   setMessage(result.located?'Indirizzo posizionato sulla mappa.':'Indirizzo non trovato o servizio momentaneamente occupato; puoi riprovare.');
  }catch{setMessage('Posizione non disponibile.');}
  finally{setBusy(false);}
 };
 const card=(b:SantaBooking,index:number,team:SantaTeamId|null)=>
  <div key={b.id} draggable={!saving&&!busy&&!planningConfirmed}
   onDragStart={e=>dragStart(e,b.id)} onDragEnd={()=>setDragId(null)}
   onDragOver={dragOver} onDrop={e=>drop(e,team,index)}
   className={'rounded-2xl border bg-background/80 p-3 text-sm shadow-sm '+(dragId===b.id?'opacity-45':'')}
   style={{borderLeftWidth:5,borderLeftColor:team?SANTA_TEAM_COLORS[team]:'#ccd4d0'}}
   data-testid="santa-booking-card">
   <div className="flex items-start justify-between gap-2">
    <div><p className="font-semibold">{b.nome} {b.cognome}</p>
     <p className="mt-1 text-xs text-muted-foreground">{santaAddress(b)}</p>
     <p className="mt-1 text-xs text-muted-foreground">{santaChildrenLines(b).length} {santaChildrenLines(b).length===1?'bambino':'bambini'}: {santaChildrenLines(b).join(', ')}</p></div>
    <button type="button" onClick={()=>setEdit({...b,bambini:[...b.bambini]})}
     className="shrink-0 rounded-full border p-2" title="Modifica prenotazione" aria-label={'Modifica '+b.cognome}>
     <Pencil className="h-4 w-4"/></button>
   </div>
   <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
    {b.squadra?<span className="font-semibold">{santaVisitTime(b.teamPosition)??'Da definire'}</span>:<span>Da assegnare</span>}
    <span className="text-muted-foreground">{money(b.quotaOffertaCents)}</span>
    {b.confirmedTime&&<span className="text-gold">{b.confirmedTime}</span>}
   </div>
   <div className="mt-3 grid grid-cols-[1fr_auto_auto] items-center gap-2">
    <label className="text-xs">
     <span className="sr-only">Assegna squadra</span>
     <select value={team??''} disabled={saving||busy||planningConfirmed}
      onChange={e=>void move(b.id,(e.target.value||null) as SantaTeamId|null)}
      className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs">
      <option value="">Senza squadra</option>
      {SANTA_TEAM_IDS.map(t=><option key={t} value={t}>{t}</option>)}
     </select>
    </label>
    <button type="button" disabled={saving||busy||planningConfirmed||index===0} title="Sposta su"
     aria-label={'Sposta su '+b.cognome}
     onClick={()=>void move(b.id,team,index-1)}
     className="rounded-lg border p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4"/></button>
    <button type="button" disabled={saving||busy||planningConfirmed||index>=((team?board.teams.find(t=>t.id===team)!.bookings:board.unassigned).length-1)}
     title="Sposta giù" aria-label={'Sposta giù '+b.cognome}
     onClick={()=>void move(b.id,team,index+1)}
     className="rounded-lg border p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4"/></button>
   </div>
  </div>;
 return <Shell hidePiazzaPill>
  {mode==='demo'&&<div className="mx-auto mt-5 max-w-6xl px-4"><div className="rounded-2xl border border-gold bg-gold/15 px-4 py-3 text-center text-sm font-bold tracking-widest">DEMO</div></div>}
  <section className="mx-auto max-w-6xl px-4 pb-6 pt-10">
   <Link to="/babbo-natale" className="text-sm text-gold underline">← Torna a Babbo Natale</Link>
   <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-gold">Croce Rossa Italiana · Comitato di Monza</p>
   <h1 className="mt-2 font-display text-4xl sm:text-6xl">La regia della Vigilia</h1>
   <p className="mt-3 max-w-2xl text-muted-foreground">Tutte le richieste, quattro squadre e una mappa: siete voi a scegliere i giri della sera del 24 dicembre.</p>
  </section>
  {auth==='loading'&&<div className="mx-auto max-w-lg px-4 py-12">Verifica dell’accesso…</div>}
  {auth==='out'&&<section className="mx-auto max-w-lg px-4 pb-20">
   <form onSubmit={signIn} className="glass-strong space-y-5 rounded-[2rem] p-6 sm:p-8">
    <LockKeyhole className="h-9 w-9 text-gold"/><h2 className="font-display text-3xl">Area organizzatori</h2>
    <p className="text-sm text-muted-foreground">Accesso riservato agli indirizzi email autorizzati dal Comitato.</p>
    <label className="block text-sm font-semibold">Indirizzo email autorizzato
     <input type="email" autoComplete="username" required className={input}
      value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label className="block text-sm font-semibold">Password
     <input type="password" autoComplete="current-password" required className={input}
      value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}
    <button type="submit" disabled={busy} className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-40">Entra</button>
   </form>
  </section>}
  {auth==='in'&&<section className="mx-auto max-w-7xl space-y-8 px-4 pb-24">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-sm">
    <span>Organizzatore: <strong>{user}</strong></span>
    <div className="flex gap-2">
     <button onClick={()=>void refresh()} className="inline-flex items-center gap-1 rounded-full border px-4 py-2"><RefreshCw className="h-4 w-4"/> Aggiorna</button>
     <button onClick={()=>void quit()} className="inline-flex items-center gap-1 rounded-full border px-4 py-2"><LogOut className="h-4 w-4"/> Esci</button>
    </div>
   </div>
   <div className="grid gap-3 sm:grid-cols-4">
    {[
     {icon:Users,label:'Richieste attive',value:String(records.filter(b=>b.status!=='annullata').length)},
     {icon:Gift,label:'Offerte indicate',value:money(offered)},
     {icon:Euro,label:'Donazioni ricevute',value:money(paid)},
     {icon:RouteIcon,label:'Visite assegnate',value:String(assigned)},
    ].map(k=><article key={k.label} className="glass rounded-2xl p-5">
     <k.icon className="h-5 w-5 text-gold"/><p className="mt-2 font-display text-3xl">{k.value}</p>
     <p className="text-xs text-muted-foreground">{k.label}</p>
    </article>)}
   </div>
   {message&&<p role="status" className="rounded-2xl border border-gold/40 bg-secondary p-4 text-sm">{message}</p>}
   <section className="glass rounded-[2rem] p-4 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
     <div><h2 className="flex items-center gap-2 font-display text-3xl"><MapPinned className="h-7 w-7 text-gold"/> Le casette sulla mappa</h2>
      <p className="mt-2 text-sm text-muted-foreground">Bianche se non assegnate; rosse, verdi, gialle e blu secondo la squadra.</p></div>
     <button type="button" onClick={exportXlsx} disabled={!records.length}
      className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
      <Download className="h-4 w-4"/> Scarica Excel</button>
    </div>
    <SantaRouteMap bookings={records}/>
   </section>
   <section>
    <h2 className="font-display text-3xl">Organizza le squadre</h2>
    <p className="mt-2 text-sm text-muted-foreground">Trascina le prenotazioni dalla colonna bianca alle squadre A, B, C o D, poi trascinale nell’ordine delle visite. Da telefono puoi usare il menu «Squadra» e le frecce. Ogni spostamento viene salvato automaticamente.</p>
    {saving&&<p role="status" className="mt-3 text-sm font-semibold text-gold">Salvataggio disposizione…</p>}
    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(200px,1fr)_minmax(0,4fr)]">
     <div className="rounded-3xl border-2 border-dashed border-border bg-secondary/20 p-3"
      onDragOver={dragOver} onDrop={e=>drop(e,null)}>
      <h3 className="px-2 py-3 font-display text-xl">Da assegnare <span className="text-sm text-muted-foreground">({board.unassigned.length})</span></h3>
      <div className="min-h-[120px] space-y-3">{board.unassigned.map((b,i)=>card(b,i,null))}
       {!board.unassigned.length&&<p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">Trascina qui le richieste senza squadra</p>}</div>
     </div>
     <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {board.teams.map(team=><div key={team.id} onDragOver={dragOver} onDrop={e=>drop(e,team.id)}
       className="min-h-[250px] rounded-3xl border-2 p-3"
       style={{borderColor:SANTA_TEAM_COLORS[team.id],backgroundColor:SANTA_TEAM_COLORS[team.id]+'0d'}}>
       <h3 className="flex items-center justify-between px-2 py-3 font-display text-xl">
        {team.id}<span className="text-sm text-muted-foreground">{team.bookings.length} visite</span></h3>
       <div className="min-h-[140px] space-y-3">{team.bookings.map((b,i)=>card(b,i,team.id))}
        {!team.bookings.length&&<p className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">Trascina qui una famiglia</p>}</div>
       {team.bookings.length>0&&<a href={mapsRouteUrl(team)} target="_blank" rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 px-2 text-xs font-semibold text-gold underline">
        <MapPin className="h-4 w-4"/> Apri il giro su Google Maps</a>}
      </div>)}
     </div>
    </div>
   </section>
   <section className="glass-strong rounded-3xl p-5 sm:p-7">
    <h2 className="font-display text-3xl">Dettagli delle prenotazioni</h2>
    <p className="mt-2 text-sm text-muted-foreground">Indirizzi, contatti e nomi dei bambini sono visibili solo qui. Per confermare una visita assegna prima la squadra e inserisci l’orario definitivo: la famiglia riceverà una mail dedicata.</p>
    <div className="mt-5 space-y-3">
     {records.map(b=><article key={b.id} className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div>
        <p className="font-display text-xl">{b.nome} {b.cognome} <span className="text-sm text-muted-foreground">· {b.status}</span></p>
        <p className="mt-1 text-sm">{santaAddress(b)} · {b.telefono}</p>
        <p className="mt-1 text-sm">Email: {b.email} · {santaChildrenLines(b).length} {santaChildrenLines(b).length===1?'bambino':'bambini'}: {santaChildrenLines(b).join('; ')}</p>
        <p className="mt-1 text-sm">Offerta indicata {money(b.quotaOffertaCents)} · Incassato {money(b.quotaIncassataCents)}</p>
        {b.note&&<p className="mt-1 text-sm text-muted-foreground">Tradizioni e informazioni per Babbo Natale: {b.note}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{b.squadra??'Da assegnare'}{b.teamPosition?' · tappa '+b.teamPosition:''}{b.confirmedTime?' · '+b.confirmedTime:''}</p>
       </div>
       <div className="flex flex-wrap gap-2">
        {!b.lat&&<button onClick={()=>void locateBooking(b)} disabled={busy}
         className="rounded-full border px-4 py-2 text-sm">Localizza</button>}
        <button onClick={()=>setEdit({...b,bambini:[...b.bambini]})}
         className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"><Pencil className="h-4 w-4"/> Modifica</button>
       </div>
      </div>
     </article>)}
     {!records.length&&<p className="rounded-2xl border p-8 text-center text-muted-foreground">Ancora nessuna richiesta. Appena una famiglia invia il modulo, la prenotazione comparirà qui.</p>}
    </div>
   </section>
   {edit&&<div role="dialog" aria-modal="true" aria-label="Modifica prenotazione"
    className="fixed inset-0 z-[90] overflow-auto bg-black/75 p-3 sm:p-8">
    <div className="mx-auto my-5 max-w-3xl rounded-[2rem] bg-background p-5 shadow-deep sm:p-8">
     <h2 className="font-display text-3xl">Famiglia {edit.cognome}</h2>
     <p className="mt-1 text-sm text-muted-foreground">Controlla la visita e l’orario prima di confermare.</p>
     <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {([['nome','Nome'],['cognome','Cognome'],['email','Email'],['telefono','Telefono'],['indirizzo','Indirizzo'],['localita','Comune']] as const).map(([key,label])=>
       <label key={key} className="text-sm font-semibold">{label}
        <input className={input} value={edit[key]} onChange={e=>change(key,e.target.value)}/></label>)}
      <label className="text-sm font-semibold">Piano
       <input className={input} maxLength={60} value={edit.piano??''}
        onChange={e=>change('piano',e.target.value)}/></label>
      <label className="text-sm font-semibold">Citofono, scala, interno, altri dettagli
       <input className={input} maxLength={240} value={edit.dettagliAccesso??''}
        onChange={e=>change('dettagliAccesso',e.target.value)}/></label>
      <div className="sm:col-span-2 space-y-3">
       <p className="text-sm font-semibold">Bambini ({edit.bambiniDettagli?.length??edit.bambini.length})</p>
       {edit.bambiniDettagli?.length
        ?edit.bambiniDettagli.map((child,i)=><div key={i} className="rounded-xl border border-gold/30 p-3">
         <div className="mb-2 flex items-center justify-between"><strong className="text-sm">Bambino {i+1}</strong>
          <button type="button" disabled={(edit.bambiniDettagli?.length??0)<=1}
           onClick={()=>removeEditChild(i)} className="text-xs text-rose-600 disabled:opacity-40">Rimuovi</button></div>
         <div className="grid gap-3 sm:grid-cols-4">
          <label className="text-xs font-semibold">Nome<input className={input} value={child.nome} maxLength={60}
           onChange={e=>updateEditChild(i,'nome',e.target.value)}/></label>
          <label className="text-xs font-semibold">Cognome<input className={input} value={child.cognome} maxLength={60}
           onChange={e=>updateEditChild(i,'cognome',e.target.value)}/></label>
          <label className="text-xs font-semibold">Soprannome<input className={input} value={child.soprannome} maxLength={40}
           onChange={e=>updateEditChild(i,'soprannome',e.target.value)}/></label>
          <label className="text-xs font-semibold">Età<input className={input} type="number" min={0} max={120}
           value={child.eta??''} onChange={e=>updateEditChild(i,'eta',e.target.value===''?null:Number(e.target.value))}/></label>
         </div>
        </div>)
        :<label className="block text-sm font-semibold">Nomi (richiesta precedente)
         <input className={input} value={edit.bambini.join(', ')}
          onChange={e=>change('bambini',e.target.value.split(',').map(x=>x.trim()).filter(Boolean))}/>
         <span className="mt-1 block text-xs font-normal text-muted-foreground">Questa richiesta precede l’aggiunta dei nuovi dati: cognome, soprannome ed età non erano stati richiesti.</span>
        </label>}
       {edit.bambiniDettagli&&<button type="button" disabled={edit.bambiniDettagli.length>=8}
        onClick={addEditChild} className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">+ Aggiungi bambino</button>}
      </div>
      <label className="sm:col-span-2 text-sm font-semibold">Tradizioni e informazioni per Babbo Natale
       <textarea rows={3} className={input} value={edit.note} onChange={e=>change('note',e.target.value)}/></label>
      <label className="text-sm font-semibold">Offerta proposta (€)
       <input type="number" min="30" className={input} value={edit.quotaOffertaCents/100}
        onChange={e=>change('quotaOffertaCents',Math.round(Number(e.target.value)*100))}/></label>
      <label className="text-sm font-semibold">Donazione ricevuta (€)
       <input type="number" min="0" className={input} value={edit.quotaIncassataCents/100}
        onChange={e=>change('quotaIncassataCents',Math.round(Number(e.target.value)*100))}/></label>
      <label className="text-sm font-semibold">Stato
       <select className={input} value={edit.status} onChange={e=>change('status',e.target.value as SantaStatus)}>
        {(['richiesta','confermata','completata','annullata'] as const).map(s=><option key={s} value={s}>{s}</option>)}</select></label>
      <label className="text-sm font-semibold">Orario definitivo della visita (19–24)
       <input type="time" min="19:00" max="23:59" className={input} value={edit.confirmedTime??''}
        onChange={e=>change('confirmedTime',e.target.value||null)}/></label>
     </div>
     <p className="mt-3 text-sm text-muted-foreground">Squadra: <strong>{edit.squadra??'non assegnata'}</strong>. La squadra e la posizione si cambiano trascinando la prenotazione nella lavagna.</p>
     {message&&<p className="mt-3 text-sm text-red-500">{message}</p>}
     <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={()=>void saveDetails()}
       className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
       <Check className="h-4 w-4"/> Salva prenotazione</button>
      <button type="button" onClick={()=>setEdit(null)} className="rounded-full border px-6 py-3 text-sm">Annulla</button>
     </div>
    </div>
   </div>}
  </section>}
 </Shell>;
}
