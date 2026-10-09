import { createFileRoute } from '@tanstack/react-router';
import { Shell } from '@/components/xmas/Shell';
import { TreeExperience } from '@/components/xmas/TreeExperience';
export const Route=createFileRoute('/albero')({
  head:()=>({meta:[
    {title:'Albero dei Regali 3D – CRI Monza · DEMO'},
    {name:'description',content:'L’Albero dei Regali di Monza: regali demo condivisi, addobbi e dediche approvate.'},
    {property:'og:title',content:'L’Albero dei Regali di Monza · DEMO'},
    {property:'og:description',content:'Ogni regalo demo accende l’albero di Monza.'},
    {property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}
  ]}),component:Albero,
});
function Albero(){return <Shell><section className="mx-auto max-w-6xl px-5 pb-7 pt-8"><p className="text-xs font-semibold uppercase text-gold">Il Natale che fa bene · DEMO</p><h1 className="mt-3 font-display text-4xl leading-tight sm:text-6xl">L’Albero dei<br /><em className="text-gold">Regali di Monza.</em></h1></section><TreeExperience /></Shell>;}
