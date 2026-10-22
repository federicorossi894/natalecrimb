import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { CalendarDays } from 'lucide-react';
import { useTreeStore } from '@/lib/tree-store';
import { useCasettaEvents, formatEventWhen, EXAMPLE_EVENTS } from '@/lib/events';
import type { TreeOrnament } from '@/lib/data';
import { HomeQr } from './Qr';
import { CriMark } from './Ornament';
import { useReducedMotion } from './TreeExperience';
const Scene=lazy(()=>import('./TreeScene'));

type Beat='panorama'|'dedica'|'eventi';
const SEQUENCE:Beat[]=['panorama','dedica','panorama','eventi'];
const DURATION:Record<Beat,number>={panorama:13000,dedica:11000,eventi:12000};
const ARRIVAL_MS=9000;
const SAFETY_RELOAD_MS=6*60*60*1000;
type WakeNavigator=Navigator&{wakeLock?:{request:(t:'screen')=>Promise<{release:()=>Promise<void>}>}};

/** Autonomous 24/7 TV direction: panorama → approved dedication → panorama → casetta events, interrupted by new gifts. */
export function TreeTV(){
  const {addedOrnaments:ornaments,addedCount,error}=useTreeStore();
  const events=useCasettaEvents();
  const [beat,setBeat]=useState<Beat>('panorama');
  const [selected,setSelected]=useState<TreeOrnament|null>(null);
  const [arriving,setArriving]=useState<string|number|null>(null);
  const previous=useRef<Set<string|number>|null>(null);
  const ornamentsRef=useRef(ornaments);
  const arrivingRef=useRef(arriving);
  const step=useRef(0);
  const cursor=useRef(0);
  const reduced=useReducedMotion();
  useEffect(()=>{ornamentsRef.current=ornaments;},[ornaments]);
  useEffect(()=>{arrivingRef.current=arriving;},[arriving]);
  useEffect(()=>{
    const ids=new Set(ornaments.map(o=>o.id));const prev=previous.current;
    if(prev){const next=ornaments.find(o=>!prev.has(o.id));if(next){setArriving(next.id);setSelected(next);setBeat('panorama');}}
    previous.current=ids;
  },[ornaments]);
  useEffect(()=>{if(!arriving)return;const t=setTimeout(()=>{setArriving(null);setSelected(null);},ARRIVAL_MS);return()=>clearTimeout(t);},[arriving]);
  useEffect(()=>{
    if(arriving)return;
    let timer:ReturnType<typeof setTimeout>;
    const run=()=>{
      const b=SEQUENCE[step.current%SEQUENCE.length]!;step.current++;
      if(b==='dedica'){const all=ornamentsRef.current,pub=all.filter(o=>o.dedica),pool=pub.length?pub:all;const next=pool.length?pool[cursor.current++%pool.length]:undefined;setSelected(next??null);setBeat(next?'dedica':'panorama');}
      else{setSelected(null);setBeat(b);}
      timer=setTimeout(run,DURATION[b]);
    };
    run();
    return()=>clearTimeout(timer);
  },[arriving]);
  // Unattended screen: keep it awake and refresh the page periodically to clear any long-run drift.
  useEffect(()=>{
    let lock:{release:()=>Promise<void>}|null=null;
    const req=async()=>{try{lock=(await (navigator as WakeNavigator).wakeLock?.request('screen'))??null;}catch{lock=null;}};
    void req();
    const vis=()=>{if(document.visibilityState==='visible')void req();};
    document.addEventListener('visibilitychange',vis);
    const reload=setInterval(()=>{if(!arrivingRef.current&&navigator.onLine)window.location.reload();},SAFETY_RELOAD_MS);
    return()=>{document.removeEventListener('visibilitychange',vis);clearInterval(reload);void lock?.release().catch(()=>{});};
  },[]);
  const showDedication=selected&&(beat==='dedica'||arriving);
  return <div className="tv-scene" data-beat={arriving?'arrivo':beat}>
    <ClientOnly><Suspense fallback={null}><Scene ornaments={ornaments} selected={selected} tv arrivingId={arriving} reduced={reduced} /></Suspense></ClientOnly>
    <div className="tv-vignette" aria-hidden />
    <div className="pointer-events-none absolute left-[4%] top-[5%] max-w-[58%]">
      <div className="flex items-center gap-[1cqw]"><CriMark className="h-[6cqw]" /><span className="border-l border-gold/40 pl-[1cqw] text-[1.1cqw] text-gold">Comitato di Monza</span></div>
      <h1 className="mt-[0.4cqw] font-display text-[2.6cqw]">L’Albero dei Regali di Monza</h1>
    </div>
    <span className="absolute right-[4%] top-[5%] border border-gold/40 px-[1cqw] py-[0.4cqw] text-[0.9cqw] text-gold">DEMO · Donazioni simulate</span>
    <div className="tv-copy">
      <p className="font-display text-[7cqw] leading-none text-gold" data-testid="tv-count">{addedCount}</p>
      <p className="mt-[0.8cqw] text-[1.3cqw] text-muted-foreground">regali appesi · dato DEMO</p>
      <h2 className="tv-title mt-[1.8cqw] font-display">Fai crescere<br /><em className="text-gold">l’Albero di Monza</em></h2>
      <div className="mt-[1.8cqw] grid grid-cols-[40%_1fr] items-center gap-[1.2cqw]">
        <HomeQr className="w-full" /><p className="text-[1.2cqw] leading-relaxed">Scansiona il QR oppure chiedi ai volontari alla casetta.</p>
      </div>
      <p className="mt-[1.2cqw] text-[0.9cqw] text-muted-foreground">Casetta CRI · Piazza San Paolo</p>
      {error&&<p className="mt-[1cqw] text-[0.9cqw] text-gold">Connessione in ripristino</p>}
    </div>
    {showDedication&&<div key={`d-${selected.id}`} className="tv-dedication tree-tag animate-rise" aria-live="polite">
      <p className="text-[0.9cqw] font-semibold uppercase text-primary">{arriving?'Un nuovo regalo è appena arrivato · DEMO':'Una dedica per Monza · DEMO'}</p>
      <p className="mt-[0.7cqw] font-display text-[1.7cqw] leading-snug">{selected.dedica?`“${selected.dedica}”`:'Un regalo per Monza. Grazie!'}</p>
      {selected.dedica&&<p className="mt-[0.7cqw] text-[1cqw] font-semibold">— {selected.firma??'Anonimo'}</p>}
    </div>}
    {beat==='eventi'&&!arriving&&<div key="eventi" className="tv-dedication tv-events animate-rise" data-testid="tv-events">
      <p className="flex items-center gap-[0.6cqw] text-[0.9cqw] font-semibold uppercase text-gold"><CalendarDays className="h-[1.2cqw] w-[1.2cqw]" />{events.length?'Prossimamente alla casetta CRI':'Esempio DEMO · nessun evento confermato'}</p>
      <ul className="mt-[1cqw] space-y-[0.9cqw]">
        {(events.length?events.map(e=>({key:e.id,title:e.title,when:formatEventWhen(e),desc:e.description})):EXAMPLE_EVENTS.map(e=>({key:e.title,title:e.title,when:'Data e orario da confermare',desc:e.description}))).map(e=><li key={e.key} className="border-l-2 border-gold/60 pl-[1cqw]">
          <p className="text-[0.85cqw] uppercase tracking-wide text-gold/90">{e.when}</p>
          <p className="font-display text-[1.6cqw] leading-tight">{e.title}</p>
          {e.desc&&<p className="text-[0.95cqw] text-muted-foreground">{e.desc}</p>}
        </li>)}
      </ul>
      {!events.length&&<p className="mt-[1cqw] text-[0.85cqw] text-muted-foreground">Esempi illustrativi: non sono eventi in programma.</p>}
    </div>}
  </div>;
}
