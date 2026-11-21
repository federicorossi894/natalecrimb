import { seoHead, PUBLIC_SEO } from '@/lib/seo';
import { ONLINE_GIFT } from '@/lib/site-experience';
import { CAMPAIGN } from "@/lib/campaign";
import { createFileRoute } from '@tanstack/react-router';
import { Shell } from '@/components/xmas/Shell';
import { TreeExperience } from '@/components/xmas/TreeExperience';
export const Route=createFileRoute('/albero')({
  staticData: { sitemap: true },
  head: () => seoHead('/albero', PUBLIC_SEO['/albero'], { image: true }),
  validateSearch:(s:Record<string,unknown>):{trova?:number;addobbo?:string}=>{const a=typeof s['addobbo']==='string'&&/^[0-9a-f-]{36}$/i.test(s['addobbo'])?{addobbo:s['addobbo']}:{};return {...(s['trova']===1||s['trova']==='1'?{trova:1}:{}),...a};},
  component:Albero,
});
function Albero(){const {trova,addobbo}=Route.useSearch();return <Shell><section className="mx-auto max-w-6xl px-5 pb-7 pt-8"><p className="text-xs font-semibold uppercase text-gold">Il Natale che fa bene {CAMPAIGN.demo && !ONLINE_GIFT && "· DEMO"}</p><h1 className="mt-3 font-display text-4xl leading-tight sm:text-6xl">Fai crescere<br /><em className="text-gold">l’Albero di Monza</em></h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">Ogni regalo aggiunge una luce, un ramo, una storia. E mentre questo albero cresce, cresce anche ciò che Croce Rossa può fare per la nostra città.</p></section><TreeExperience autoFind={trova===1} {...(addobbo?{focusId:addobbo}:{})} /></Shell>;}
