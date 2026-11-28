/** Organizzazione MANUALE della Vigilia: nessun algoritmo assegna famiglie.
 * I soli colori corrispondono alla colonna scelta dall'organizzatore.
 */
export const SANTA_TEAM_IDS=['Squadra A','Squadra B','Squadra C','Squadra D'] as const;
export type SantaTeamId=typeof SANTA_TEAM_IDS[number];
export type SantaStatus='richiesta'|'confermata'|'completata'|'annullata';
export type SantaMode='demo'|'live';
export const SANTA_VISIT_TIMES=['19:30','20:30','21:30','22:30'] as const;
export type SantaPaymentState='non_richiesto'|'da_pagare'|'in_verifica'|'pagato_online'|'pagato_bonifico';
export function santaVisitTime(position:number|null){return position&&position>=1&&position<=4?SANTA_VISIT_TIMES[position-1]:null;}
export const SANTA_TEAM_COLORS:Record<SantaTeamId,string>={
 'Squadra A':'#c63b39', 'Squadra B':'#288652',
 'Squadra C':'#e2b530', 'Squadra D':'#397bd6',
};
export type SantaChild={nome:string;cognome:string;soprannome:string;eta:number|null};
export type SantaBooking={
 id:string;nome:string;cognome:string;email:string;telefono:string;
 indirizzo:string;localita:string;piano?:string|null;dettagliAccesso?:string|null;
 bambini:string[];bambiniDettagli?:SantaChild[]|null;note:string;
 quotaOffertaCents:number;quotaIncassataCents:number;paymentState?:SantaPaymentState;paymentMethod?:string|null;
 squadra:SantaTeamId|null;teamPosition:number|null;confirmedTime:string|null;
 status:SantaStatus;mode:SantaMode;lat:number|null;lon:number|null;
 geocodeStatus:'pending'|'located'|'approximate'|'unavailable';
};
export type SantaTeam={id:SantaTeamId;bookings:SantaBooking[]};
export type SantaBoard={unassigned:SantaBooking[];teams:SantaTeam[]};
export const hasCoords=(b:Pick<SantaBooking,'lat'|'lon'>):b is typeof b&{lat:number;lon:number}=>
 typeof b.lat==='number'&&Number.isFinite(b.lat)&&typeof b.lon==='number'&&Number.isFinite(b.lon)
 &&b.lat>=-90&&b.lat<=90&&b.lon>=-180&&b.lon<=180;
export function santaBoard(bookings:SantaBooking[]):SantaBoard{
 const visible=bookings.filter(b=>b.status!=='annullata');
 const ordered=(a:SantaBooking,b:SantaBooking)=>(a.teamPosition??999)-(b.teamPosition??999)||a.cognome.localeCompare(b.cognome,'it');
 return {
  unassigned:visible.filter(b=>!b.squadra).sort(ordered),
  teams:SANTA_TEAM_IDS.map(id=>({id,bookings:visible.filter(b=>b.squadra===id).sort(ordered)})),
 };
}
export function moveSantaBooking(
 bookings:SantaBooking[],id:string,to:SantaTeamId|null,at?:number
):SantaBooking[]{
 if(!bookings.some(b=>b.id===id))return bookings;
 const board=santaBoard(bookings);
 const lanes:Record<string,string[]>={'unassigned':board.unassigned.map(b=>b.id)};
 for(const t of board.teams)lanes[t.id]=t.bookings.map(b=>b.id);
 for(const list of Object.values(lanes)){
  const pos=list.indexOf(id);
  if(pos>=0)list.splice(pos,1);
 }
 const destination=lanes[to??'unassigned']!;
 if(to&&destination.length>=4&&!destination.includes(id))return bookings;
 destination.splice(Math.min(Math.max(at??destination.length,0),destination.length),0,id);
 const placements=new Map<string,{team:SantaTeamId|null;position:number|null}>();
 for(const [lane,ids] of Object.entries(lanes)){
  ids.forEach((entry,index)=>placements.set(entry,{
   team:lane==='unassigned'?null:lane as SantaTeamId,
   position:lane==='unassigned'?null:index+1,
  }));
 }
 return bookings.map(b=>{
  const item=placements.get(b.id);
  return item?{...b,squadra:item.team,teamPosition:item.position}:b;
 });
}
export function santaBoardPayload(bookings:SantaBooking[]){
 const board=santaBoard(bookings);
 const payload:Array<{id:string;team:SantaTeamId|null;position:number|null}> =
  board.unassigned.map(b=>({id:b.id,team:null,position:null}));
 for(const lane of board.teams)
  lane.bookings.forEach((b,index)=>payload.push({id:b.id,team:lane.id,position:index+1}));
 return payload;
}
export function mapsRouteUrl(team:SantaTeam){
 const coords=team.bookings.filter(hasCoords);
 if(!coords.length)return '';
 const url=new URL('https://www.google.com/maps/dir/');
 url.searchParams.set('api','1');url.searchParams.set('travelmode','driving');
 url.searchParams.set('origin',coords[0]!.lat+','+coords[0]!.lon);
 url.searchParams.set('destination',coords[coords.length-1]!.lat+','+coords[coords.length-1]!.lon);
 if(coords.length>2)url.searchParams.set('waypoints',coords.slice(1,-1).map(b=>b.lat+','+b.lon).join('|'));
 return url.toString();
}
