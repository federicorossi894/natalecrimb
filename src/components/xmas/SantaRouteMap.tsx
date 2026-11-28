import {useEffect,useRef,useState} from 'react';
import {SANTA_TEAM_COLORS,SANTA_TEAM_IDS,hasCoords,santaBoard,type SantaBooking} from '@/lib/santa-planner';

type MapInstance={setView:(p:number[],z:number)=>MapInstance;fitBounds:(b:unknown,o?:unknown)=>void;remove:()=>void};
type Marker={addTo:(map:MapInstance)=>Marker;bindPopup:(node:HTMLElement)=>Marker};
type Leaflet={
 map:(node:HTMLElement,o:Record<string,unknown>)=>MapInstance;
 tileLayer:(url:string,o:Record<string,unknown>)=>{addTo:(map:MapInstance)=>unknown};
 divIcon:(opts:Record<string,unknown>)=>unknown;
 marker:(at:number[],opts:Record<string,unknown>)=>Marker;
 polyline:(coords:number[][],opts:Record<string,unknown>)=>{addTo:(map:MapInstance)=>unknown};
 latLngBounds:(coords:number[][])=>unknown;
};
declare global{interface Window{L?:Leaflet}}
let loader:Promise<Leaflet>|undefined;
function loadLeaflet():Promise<Leaflet>{
 if(loader)return loader;
 loader=new Promise((resolve,reject)=>{
  if(window.L)return resolve(window.L);
  if(!document.querySelector('link[data-santa-map]')){
   const css=document.createElement('link');css.rel='stylesheet';
   css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
   css.setAttribute('data-santa-map','');document.head.append(css);
  }
  const script=document.createElement('script');
  script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.async=true;
  script.onload=()=>window.L?resolve(window.L):reject(new Error('Map unavailable'));
  script.onerror=()=>reject(new Error('Map unavailable'));
  document.head.append(script);
 });
 return loader;
}
function houseIcon(L:Leaflet,color:string,position:number|null){
 const bg=color==='white'?'#ffffff':color;
 const label=position===null?'':`<small style="position:absolute;top:-6px;right:-6px;border-radius:50%;background:#173d30;color:white;min-width:17px;height:17px;text-align:center;font:700 11px Arial;line-height:17px;">${position}</small>`;
 const html=`<span aria-hidden="true" style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:${bg};border:2px solid #fff;border-radius:11px;box-shadow:0 1px 9px #0004;font-size:20px;">🏠${label}</span>`;
 return L.divIcon({html,className:'santa-house-pin',iconSize:[36,36],iconAnchor:[18,18]});
}
export function SantaRouteMap({bookings}:{bookings:SantaBooking[]}){
 const node=useRef<HTMLDivElement>(null),map=useRef<MapInstance|null>(null);
 const [error,setError]=useState('');
 const unmapped=bookings.filter(b=>b.status!=='annullata'&&!hasCoords(b)).length;
 useEffect(()=>{
  if(!node.current)return;
  let current=true;
  void loadLeaflet().then(L=>{
   if(!current||!node.current)return;
   map.current?.remove();
   const instance=L.map(node.current,{scrollWheelZoom:false,zoomControl:true})
    .setView([45.5797,9.2744],12);
   map.current=instance;
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18,attribution:'© OpenStreetMap contributors',
   }).addTo(instance);
   const pts:number[][]=[];
   const board=santaBoard(bookings);
   const all=[...board.unassigned,...board.teams.flatMap(t=>t.bookings)];
   for(const b of all){
    if(!hasCoords(b))continue;
    const pos=[b.lat,b.lon];
    pts.push(pos);
    const color=b.squadra?SANTA_TEAM_COLORS[b.squadra]:'white';
    const pin=L.marker(pos,{icon:houseIcon(L,color,b.teamPosition)}).addTo(instance);
    const popup=document.createElement('div');
    const top=document.createElement('strong');top.textContent=b.nome+' '+b.cognome;
    const address=document.createElement('p');
    address.textContent=b.indirizzo+', '+b.localita;
    address.style.margin='5px 0';
    const assignment=document.createElement('small');
    assignment.textContent=b.squadra
     ?b.squadra+' · tappa '+(b.teamPosition??'?')
     :'Da assegnare';
    popup.append(top,address,assignment);
    pin.bindPopup(popup);
   }
   for(const team of SANTA_TEAM_IDS){
    const ordered=board.teams.find(x=>x.id===team)!.bookings.filter(hasCoords);
    if(ordered.length>1){
     L.polyline(ordered.map(b=>[b.lat,b.lon]),{
      color:SANTA_TEAM_COLORS[team],weight:4,opacity:0.85,dashArray:'8 5',
     }).addTo(instance);
    }
   }
   if(pts.length)instance.fitBounds(L.latLngBounds(pts),{padding:[40,40],maxZoom:15});
   setError('');
  }).catch(()=>{if(current)setError('Impossibile caricare la mappa. La lavagna e le prenotazioni restano disponibili.');});
  return ()=>{current=false;map.current?.remove();map.current=null;};
 },[bookings]);
 return <div>
  <div ref={node} className="h-[390px] w-full overflow-hidden rounded-2xl bg-[#e2e8dc] sm:h-[510px]" data-testid="santa-house-map"/>
  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
   <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-muted-foreground bg-white"/>Da assegnare</span>
   {SANTA_TEAM_IDS.map(team=><span key={team} className="flex items-center gap-1.5">
    <span className="h-3 w-3 rounded" style={{background:SANTA_TEAM_COLORS[team]}}/>{team}</span>)}
  </div>
  {unmapped>0&&<p className="mt-2 text-xs text-amber-600">{unmapped} {unmapped===1?'indirizzo senza posizione sulla mappa':'indirizzi senza posizione sulla mappa'}: puoi correggere l’indirizzo e usare «Localizza» nella prenotazione.</p>}
  {error&&<p role="status" className="mt-3 text-sm text-amber-600">{error}</p>}
  <p className="mt-2 text-xs text-muted-foreground">Le linee colorate seguono l’ordine delle tappe scelto dagli organizzatori; non rappresentano tempi di viaggio calcolati.</p>
 </div>;
}
