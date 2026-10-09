import { lazy, Suspense, useEffect, useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { LocateFixed, RotateCcw, ChevronLeft, ChevronRight, X, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTreeStore } from '@/lib/tree-store';
import type { TreeOrnament } from '@/lib/data';
import { OrnamentIcon } from './Ornament';
const Scene=lazy(()=>import('./TreeScene'));
export function useReducedMotion(){const [reduced,setReduced]=useState(false);useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(m.matches);update();m.addEventListener('change',update);return()=>m.removeEventListener('change',update);},[]);return reduced;}
export function TreeExperience(){
  const {addedOrnaments:ornaments,addedCount,mine,error}=useTreeStore();
  const [selected,setSelected]=useState<TreeOrnament|null>(null);
  const [reset,setReset]=useState(0);
  const [notice,setNotice]=useState('');
  const reduced=useReducedMotion();
  const pick=(o:TreeOrnament)=>{setSelected(o);setNotice('');const stage=document.querySelector('.tree-stage');if(stage)window.scrollTo({top:stage.getBoundingClientRect().top+window.scrollY-82,behavior:'instant'});};
  const find=()=>{const ids=new Set(mine.map(o=>o.id));const own=ornaments.filter(o=>ids.has(String(o.id)));if(!own.length){setNotice('Non ci sono ancora tuoi addobbi visibili da questo dispositivo.');return;}const i=own.findIndex(o=>o.id===selected?.id);const next=own[(i+1)%own.length];if(next)pick(next);};
  const step=(dir:number)=>{const i=ornaments.findIndex(o=>o.id===selected?.id);const next=ornaments[(i+dir+ornaments.length)%ornaments.length];if(next)pick(next);};
  return <>
    <div className="relative">
      <ClientOnly fallback={<div className="tree-stage" />}><Suspense fallback={<div className="tree-stage flex items-center justify-center text-gold">L’albero si accende…</div>}><Scene ornaments={ornaments} selected={selected} onPick={pick} resetKey={reset} reduced={reduced} /></Suspense></ClientOnly>
      <div className="pointer-events-none absolute inset-x-0 top-5 flex items-start justify-between gap-4 px-5">
        <div><p className="text-xs font-semibold uppercase text-gold">DEMO · Albero condiviso</p><p className="mt-1 font-display text-2xl">{addedCount} regali appesi</p></div>
        <Button variant="outline" size="icon" className="pointer-events-auto" title="Vista generale" aria-label="Vista generale" onClick={()=>{setSelected(null);setReset(s=>s+1);}}><RotateCcw /></Button>
      </div>
      <div className="flex min-h-20 items-center justify-center gap-2 px-3">
        <Button variant="outline" size="icon" aria-label="Addobbo precedente" onClick={()=>step(-1)} disabled={!ornaments.length}><ChevronLeft /></Button>
        <Button onClick={find} className="h-10 shadow-deep"><LocateFixed />Trova il mio addobbo</Button>
        <Button variant="outline" size="icon" aria-label="Addobbo successivo" onClick={()=>step(1)} disabled={!ornaments.length}><ChevronRight /></Button>
      </div>
    </div>
    {error&&<p role="status" className="mt-3 text-sm text-gold">Aggiornamento temporaneamente non disponibile. Riproveremo automaticamente.</p>}
    {notice&&<p role="status" className="mt-4 text-sm text-gold">{notice}</p>}
    {selected&&<div className="tree-tag mx-auto mt-8 max-w-lg" aria-live="polite">
      <Button variant="ghost" size="icon" className="absolute right-1 top-1" aria-label="Chiudi dedica" onClick={()=>setSelected(null)}><X /></Button>
      <div className="flex items-center gap-3"><OrnamentIcon kind={selected.kind} className="w-10 shrink-0" /><p className="text-xs font-semibold uppercase text-primary">Un regalo per Monza · DEMO</p></div>
      <p className="mt-4 font-display text-2xl leading-snug">{selected.dedica?`“${selected.dedica}”`:'Un gesto di vicinanza, un regalo per la città.'}</p>
      <p className="mt-3 text-sm font-semibold">— {selected.firma??'Anonimo'}</p>
      {!selected.dedica&&<p className="mt-3 text-xs">Nessuna dedica pubblica.</p>}
    </div>}
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h2 className="font-display text-2xl">I regali di questa demo</h2>
      {!ornaments.length&&<p className="mt-3 text-muted-foreground">Il primo regalo accenderà l’albero.</p>}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{ornaments.map((o,i)=><Button key={o.id} variant={selected?.id===o.id?'secondary':'outline'} className="h-auto min-h-16 justify-start whitespace-normal py-2 text-left" aria-label={`Seleziona addobbo ${i+1}`} onClick={()=>pick(o)}><OrnamentIcon kind={o.kind} className="h-9 w-8 shrink-0" /><span className="min-w-0 text-xs">{o.firma??`Regalo ${i+1}`}<span className="mt-1 block text-muted-foreground">{o.dedica?'Dedica pubblica':'DEMO'}</span></span></Button>)}</div>
      {mine.length>0&&<div className="mt-8 border-t pt-5"><h3 className="font-display text-xl">I tuoi addobbi</h3>{mine.map(o=><p key={o.id} className="mt-2 text-sm text-muted-foreground"><Gift className="mr-2 inline h-4 w-4 text-gold" />{o.dedica?`“${o.dedica}”`:'Senza dedica'} · {o.status==='approved'?'approvato':o.status==='pending'?'in moderazione':'testo non pubblicato'}</p>)}</div>}
    </div>
  </>;
}
