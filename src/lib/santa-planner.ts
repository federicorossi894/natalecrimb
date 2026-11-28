/** Proposta logistica per il 24 dicembre. Il routing usa prossimità geografica,
 * NON stime di guida. Nessuna prenotazione è mai confermata automaticamente.
 */
export const SANTA_VISIT_SLOTS=['19:30','20:30','21:30','22:30'] as const;
export type SantaSlot=typeof SANTA_VISIT_SLOTS[number];
export type SantaStatus='richiesta'|'confermata'|'completata'|'annullata';
export type SantaBooking={
 id:string;nome:string;cognome:string;email:string;telefono:string;
 indirizzo:string;localita:string;bambini:string[];note:string;
 quotaOffertaCents:number;quotaIncassataCents:number;
 slotPreferito:SantaSlot|'indifferente';slotAssegnato:SantaSlot|null;
 squadra:string|null;status:SantaStatus;lat:number|null;lon:number|null;
};
export type SantaTeam={id:string;bookings:Array<SantaBooking&{slot:SataSlot}>;lengthKm:number;warnings:string[]};
type SataSlot=SantaSlot;
export const SANTA_DEMO_BOOKINGS:SantaBooking[]=[
 {id:'esempio-01',nome:'Famiglia',cognome:'Centro',email:'esempio1@example.invalid',telefono:'000 0000001',indirizzo:'Zona Centro (indirizzo dimostrativo)',localita:'Monza',bambini:['Anna','Luca'],note:'Esempio: raccontare una storia natalizia',quotaOffertaCents:3000,quotaIncassataCents:0,slotPreferito:'19:30',slotAssegnato:null,squadra:null,status:'richiesta',lat:45.5835,lon:9.2758},
 {id:'esempio-02',nome:'Famiglia',cognome:'San Biagio',email:'esempio2@example.invalid',telefono:'000 0000002',indirizzo:'Zona San Biagio (indirizzo dimostrativo)',localita:'Monza',bambini:['Sofia'],note:'',quotaOffertaCents:4000,quotaIncassataCents:0,slotPreferito:'20:30',slotAssegnato:null,squadra:null,status:'richiesta',lat:45.5864,lon:9.2662},
 {id:'esempio-03',nome:'Famiglia',cognome:'Triante',email:'esempio3@example.invalid',telefono:'000 0000003',indirizzo:'Zona Triante (indirizzo dimostrativo)',localita:'Monza',bambini:['Marta'],note:'',quotaOffertaCents:3500,quotaIncassataCents:0,slotPreferito:'21:30',slotAssegnato:null,squadra:null,status:'richiesta',lat:45.5762,lon:9.2568},
 {id:'esempio-04',nome:'Famiglia',cognome:'San Giuseppe',email:'esempio4@example.invalid',telefono:'000 0000004',indirizzo:'Zona San Giuseppe (indirizzo dimostrativo)',localita:'Monza',bambini:['Pietro'],note:'',quotaOffertaCents:3000,quotaIncassataCents:0,slotPreferito:'22:30',slotAssegnato:null,squadra:null,status:'richiesta',lat:45.5741,lon:9.2711},
 {id:'esempio-05',nome:'Famiglia',cognome:'San Rocco',email:'esempio5@example.invalid',telefono:'000 0000005',indirizzo:'Zona San Rocco (indirizzo dimostrativo)',localita:'Monza',bambini:['Alice','Riccardo'],note:'',quotaOffertaCents:3000,quotaIncassataCents:0,slotPreferito:'19:30',slotAssegnato:null,squadra:null,status:'richiesta',lat:45.5609,lon:9.2834},
 {id:'esempio-06',nome:'Famiglia',cognome:'Cederna',email:'esempio6@example.invalid',telefono:'000 0000006',indirizzo:'Zona Cederna (indirizzo dimostrativo)',localita:'Monza',bambini:['Leo'],note:'',quotaOffertaCents:4500,quotaIncassataCents:0,slotPreferito:'20:30',slotAssegnato:null,squadra:null,status:'richiesta',lat:45.5754,lon:9.3081},
];
export const hasCoords=(b:SantaBooking):b is SantaBooking&{lat:number;lon:number}=>
 typeof b.lat==='number'&&Number.isFinite(b.lat)&&typeof b.lon==='number'&&Number.isFinite(b.lon)
 &&b.lat>=-90&&b.lat<=90&&b.lon>=-180&&b.lon<=180;
export function distanceKm(a:Pick<SantaBooking,'lat'|'lon'>,b:Pick<SantaBooking,'lat'|'lon'>){
 if(!hasCoords(a as SantaBooking)||!hasCoords(b as SantaBooking))return Infinity;
 const lat1=(a.lat as number)*Math.PI/180,lat2=(b.lat as number)*Math.PI/180;
 const dlat=lat2-lat1,dlon=((b.lon as number)-(a.lon as number))*Math.PI/180;
 const hav=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
 return 12742*Math.atan2(Math.sqrt(hav),Math.sqrt(Math.max(0,1-hav)));
}
/** Greedy insertion: prefer a close predecessor; cap teams at four visits.
 * Only a suggestion; staff confirm travel durations and actual team count.
 */
export function suggestSantaTeams(bookings:SantaBooking[]):{teams:SantaTeam[];unmapped:SantaBooking[];warnings:string[]}{
 const relevant=bookings.filter(b=>b.status!=='annullata');
 const mapped=relevant.filter(hasCoords);
 const unmapped=relevant.filter(b=>!hasCoords(b));
 const groups:Array<Array<typeof mapped[number]>>=[];
 const remaining=[...mapped];
 const name=(i:number)=>'Squadra '+String.fromCharCode(65+i);
 while(remaining.length){
  const start=remaining.shift()!;
  const group=[start];
  while(remaining.length&&group.length<4){
   const tail=group[group.length-1]!;
   const near=remaining.map((b,i)=>({b,i,km:distanceKm(tail,b)})).sort((a,b)=>a.km-b.km)[0]!;
   // Conservative geographical split; straight-line distances are NOT driving times.
   if(near.km>4.5&&group.length>=2)break;
   group.push(remaining.splice(near.i,1)[0]!);
  }
  groups.push(group);
 }
 const teams:SantaTeam[]=groups.map((group,i)=>{
  let lengthKm=0;for(let j=1;j<group.length;j++)lengthKm+=distanceKm(group[j-1]!,group[j]!);
  const warnings:string[]=[];
  group.forEach((b,j)=>{
   if(b.slotPreferito!=='indifferente'&&b.slotPreferito!==SANTA_VISIT_SLOTS[j])
    warnings.push(`${b.cognome}: orario richiesto ${b.slotPreferito}, suggerito ${SANTA_VISIT_SLOTS[j]}`);
  });
  return {id:name(i),bookings:group.map((b,j)=>({...b,slot:SANTA_VISIT_SLOTS[j]!})),lengthKm,warnings};
 });
 const warnings:string[]=[];
 if(unmapped.length)warnings.push(`${unmapped.length} richieste senza coordinate: non collocabili in mappa né nel percorso automatico`);
 warnings.push('La distanza è in linea d’aria: controllare traffico, tempi stradali e 30 minuti effettivi della visita prima di confermare');
 return {teams,unmapped,warnings};
}
export function mapsRouteUrl(team:SantaTeam){
 const pts=team.bookings.filter(hasCoords);
 if(!pts.length)return '';
 const url=new URL('https://www.google.com/maps/dir/');
 url.searchParams.set('api','1');
 url.searchParams.set('travelmode','driving');
 url.searchParams.set('origin',`${pts[0]!.lat},${pts[0]!.lon}`);
 url.searchParams.set('destination',`${pts[pts.length-1]!.lat},${pts[pts.length-1]!.lon}`);
 if(pts.length>2)url.searchParams.set('waypoints',pts.slice(1,-1).map(x=>`${x.lat},${x.lon}`).join('|'));
 return url.href;
}
