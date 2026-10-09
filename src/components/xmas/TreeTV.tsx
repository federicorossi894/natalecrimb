import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { useTreeStore } from '@/lib/tree-store';
import type { TreeOrnament } from '@/lib/data';
import { HomeQr } from './Qr';
import { useReducedMotion } from './TreeExperience';
const Scene=lazy(()=>import('./TreeScene'));
export function TreeTV(){
  const {addedOrnaments:ornaments,addedCount,error}=useTreeStore();
  const [selected,setSelected]=useState<TreeOrnament|null>(null);
  const [arriving,setArriving]=useState<string|number|null>(null);
  const previous=useRef<Set<string|number>|null>(null);
  const cursor=useRef(0);
  const focused=useRef(false);
  const reduced=useReducedMotion();
  useEffect(()=>{
    const ids=new Set(ornaments.map(o=>o.id));const prev=previous.current;
    if(prev){const next=ornaments.find(o=>!prev.has(o.id));if(next){setArriving(next.id);setSelected(next);}}
    previous.current=ids;
  },[ornaments]);
  useEffect(()=>{if(!arriving)return;const t=setTimeout(()=>{setArriving(null);setSelected(null);},6500);return()=>clearTimeout(t);},[arriving]);
  useEffect(()=>{
    if(arriving||reduced)return;
    const t=setInterval(()=>{if(focused.current){focused.current=false;setSelected(null);return;}const publicDedications=ornaments.filter(o=>o.dedica);const next=publicDedications[cursor.current%publicDedications.length];cursor.current++;focused.current=Boolean(next);setSelected(next??null);},9000);
    return()=>clearInterval(t);
  },[ornaments,arriving,reduced]);
  return <div className="tv-scene">
    <ClientOnly><Suspense fallback={null}><Scene ornaments={ornaments} selected={selected} tv arrivingId={arriving} reduced={reduced} /></Suspense></ClientOnly>
    <div className="pointer-events-none absolute left-[4%] top-[5%] max-w-[58%]">
      <p className="text-[0.9cqw] font-semibold uppercase text-gold">Croce Rossa Italiana · Comitato di Monza</p>
      <h1 className="mt-[0.6cqw] font-display text-[2.6cqw]">L’Albero dei Regali di Monza</h1>
    </div>
    <span className="absolute right-[4%] top-[5%] border border-gold/40 px-[1cqw] py-[0.4cqw] text-[0.9cqw] text-gold">DEMO · Donazioni simulate</span>
    <div className="tv-copy">
      <p className="font-display text-[7cqw] leading-none text-gold" data-testid="tv-count">{addedCount}</p>
      <p className="mt-[0.8cqw] text-[1.4cqw] text-muted-foreground">regali appesi · DEMO</p>
      <h2 className="tv-title mt-[2cqw] font-display">Il prossimo<br /><em className="text-gold">può essere il tuo.</em></h2>
      <div className="mt-[2cqw] grid grid-cols-[40%_1fr] items-center gap-[1.2cqw]">
        <HomeQr className="w-full" /><p className="text-[1.2cqw] leading-relaxed">Scansiona e appendi anche tu un regalo all’Albero di Monza.</p>
      </div>
      <p className="mt-[1.2cqw] text-[0.9cqw] text-muted-foreground">Casetta CRI · Piazza San Paolo</p>
      {error&&<p className="mt-[1cqw] text-[0.9cqw] text-gold">Connessione in ripristino</p>}
    </div>
    {selected&&<div className="tv-dedication tree-tag animate-rise" aria-live="polite">
      <p className="text-[0.9cqw] font-semibold uppercase text-primary">{arriving?'Un nuovo regalo accende l’albero · DEMO':'Una dedica per Monza · DEMO'}</p>
      <p className="mt-[0.7cqw] font-display text-[1.7cqw] leading-snug">{selected.dedica?`“${selected.dedica}”`:'Un regalo anonimo per Monza.'}</p>
      {selected.dedica&&<p className="mt-[0.7cqw] text-[1cqw] font-semibold">— {selected.firma??'Anonimo'}</p>}
    </div>}
  </div>;
}
