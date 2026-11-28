import {useEffect,useRef,useState} from 'react';
import type {SantaTeam} from '@/lib/santa-planner';
import {hasCoords} from '@/lib/santa-planner';

/** Read-only geographical planning map. The OSM tiles show the city;
 * family names/addresses are NEVER sent to the tile server. The suggested
 * connecting lines are straight-line indicators, not driving routes.
 */
type MapInstance={setView:(p:number[],z:number)=>MapInstance;fitBounds:(b:unknown,o?:unknown)=>void;remove:()=>void};
type LeafletApi={
 map:(el:HTMLElement,o:Record<string,unknown>)=>MapInstance;
 tileLayer:(url:string,o:Record<string,unknown>)=>{addTo:(m:MapInstance)=>unknown};
 circleMarker:(p:number[],o:Record<string,unknown>)=>{addTo:(m:MapInstance)=>{bindPopup:(content:HTMLElement)=>unknown}};
 polyline:(p:number[][],o:Record<string,unknown>)=>{addTo:(m:MapInstance)=>unknown};
 latLngBounds:(p:number[][])=>unknown;
};
declare global {interface Window{L?:LeafletApi}}
let once:Promise<LeafletApi>|undefined;
function loadLeaflet(){
 if(once)return once;
 once=new Promise((resolve,reject)=>{
  if(window.L){resolve(window.L);return;}
  if(!document.querySelector('link[data-santa-leaflet]')){
   const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
   css.setAttribute('data-santa-leaflet','1');document.head.appendChild(css);
  }
  const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.async=true;script.onload=()=>window.L?resolve(window.L):reject(new Error('Map library missing'));
  script.onerror=()=>reject(new Error('Cannot load map'));
  document.head.appendChild(script);
 });
 return once;
}
const colors=['#a23a36','#335e43','#a87d25','#366791','#865c8b','#c06439'];
export function SantaRouteMap({teams}:{teams:SantaTeam[]}){
 const container=useRef<HTMLDivElement>(null),instance=useRef<MapInstance|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!container.current)return;
  let active=true;
  void loadLeaflet().then(L=>{
   if(!active||!container.current)return;
   instance.current?.remove();
   const map=L.map(container.current,{scrollWheelZoom:false,zoomControl:true}).setView([45.5797,9.2744],12);
   instance.current=map;
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18,attribution:'&copy; OpenStreetMap contributors',
   }).addTo(map);
   const coords:number[][]=[];
   teams.forEach((team,index)=>{
    const valid=team.bookings.filter(hasCoords);
    const positions=valid.map(b=>[b.lat!,b.lon!]);
    coords.push(...positions);
    if(positions.length>1)L.polyline(positions,{color:colors[index%colors.length],weight:4,opacity:0.8,dashArray:'7 5'}).addTo(map);
    valid.forEach((b)=>{
     const popup=document.createElement('div');
     const name=document.createElement('strong');name.textContent=team.id+' · '+b.slot;
     const detail=document.createElement('p');detail.textContent=b.nome+' '+b.cognome+' · '+b.indirizzo;
     detail.style.margin='5px 0 0';
     popup.append(name,detail);
     L.circleMarker([b.lat!,b.lon!],{
      radius:10,weight:3,color:'#ffffff',fillColor:colors[index%colors.length],fillOpacity:1,
     }).addTo(map).bindPopup(popup);
    });
   });
   if(coords.length)map.fitBounds(L.latLngBounds(coords),{padding:[35,35],maxZoom:14});
   setError('');
  }).catch(()=>{if(active)setError('La mappa stradale non è disponibile in questo browser; restano utilizzabili elenco e itinerari delle squadre.');});
  return ()=>{active=false;instance.current?.remove();instance.current=null;};
 },[teams]);
 return <section aria-label="Mappa delle squadre di Babbo Natale">
  <div ref={container} className="h-[390px] w-full overflow-hidden rounded-2xl bg-[#e2e8dc] sm:h-[510px]" data-testid="santa-route-map"/>
  {error&&<p className="mt-2 text-sm text-amber-600">{error}</p>}
  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Mappa riservata agli organizzatori · dati dimostrativi nella preview · i tratti collegano i punti in linea d’aria, non rappresentano percorsi stradali verificati. Per valutare i tempi di guida occorre un servizio di routing.</p>
 </section>;
}
