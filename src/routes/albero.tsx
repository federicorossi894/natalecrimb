import { CAMPAIGN } from "@/lib/campaign";
import { createFileRoute } from '@tanstack/react-router';
import { Shell } from '@/components/xmas/Shell';
import { TreeExperience } from '@/components/xmas/TreeExperience';
export const Route=createFileRoute('/albero')({
  head:()=>({meta:[
    {title:`Albero dei Regali 3D – CRI Monza${CAMPAIGN.demo ? ' · DEMO' : ''}`},
    {name:'description',content:'L’Albero dei Regali di Monza: addobbi e dediche approvate.'},
    {property:'og:title',content:`L’Albero dei Regali di Monza${CAMPAIGN.demo ? ' · DEMO' : ''}`},
    {property:'og:description',content:'L’Albero dei Regali di Monza.'},
    {property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}
  ]}),
  validateSearch:(s:Record<string,unknown>):{trova?:number;addobbo?:string}=>{const a=typeof s['addobbo']==='string'&&/^[0-9a-f-]{36}$/i.test(s['addobbo'])?{addobbo:s['addobbo']}:{};return {...(s['trova']===1||s['trova']==='1'?{trova:1}:{}),...a};},
  component:Albero,
});
function Albero(){const {trova,addobbo}=Route.useSearch();return <Shell><section className="mx-auto max-w-6xl px-5 pb-7 pt-8"><p className="text-xs font-semibold uppercase text-gold">Il Natale che fa bene {CAMPAIGN.demo && "· DEMO"}</p><h1 className="mt-3 font-display text-4xl leading-tight sm:text-6xl">Fai crescere<br /><em className="text-gold">l’Albero di Monza</em></h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">Ogni regalo aggiunge una luce, un ramo, una storia. E mentre questo albero cresce, cresce anche ciò che Croce Rossa può fare per la nostra città.</p></section><TreeExperience autoFind={trova===1} {...(addobbo?{focusId:addobbo}:{})} /></Shell>;}
