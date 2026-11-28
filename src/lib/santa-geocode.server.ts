/** Single address-to-point lookup, only for saved Santa visits.
 * Specific Monza household routing use; no autocomplete, no public geocoder.
 * Request throttle <= 1 / 1.2s globally in database; results cached.
 * Never share parent or child names, emails, phone numbers with geocoder.
 */
import {supabaseAdmin} from '@/integrations/supabase/client.server';
const db=supabaseAdmin as unknown as {from:(table:string)=>any;rpc:(name:string,params?:any)=>Promise<any>};
async function hex(value:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
}
export async function locateSantaBooking(bookingId:string):Promise<boolean>{
 const {data:b}=await db.from('santa_bookings').select('id,indirizzo,localita,latitude,longitude')
  .eq('id',bookingId).maybeSingle();
 if(!b)return false;
 const address=(String(b.indirizzo)+', '+String(b.localita)+', Lombardia, Italia').replace(/\s+/g,' ').trim();
 const key=await hex(address.toLocaleLowerCase('it-IT'));
 const {data:cached}=await db.from('santa_geocode_cache').select('latitude,longitude,result')
  .eq('address_key',key).maybeSingle();
 const apply=async(coords:{latitude:number|null;longitude:number|null;result:'located'|'unavailable'})=>{
  if(coords.result==='located'&&coords.latitude!==null&&coords.longitude!==null){
   // A postal result may refer to street center rather than exact entrance.
   await db.from('santa_bookings').update({
    latitude:coords.latitude,longitude:coords.longitude,geocode_status:'approximate',
   }).eq('id',bookingId).eq('indirizzo',b.indirizzo).eq('localita',b.localita);
   return true;
  }
  await db.from('santa_bookings').update({geocode_status:'unavailable'})
   .eq('id',bookingId).eq('indirizzo',b.indirizzo).eq('localita',b.localita);
  return false;
 };
 if(cached?.result==='located')return apply(cached);
 if(cached?.result==='unavailable'&&Date.now()-new Date(cached.updated_at??0).getTime()<86400000)return false;
 const {data:permit,error:gateError}=await db.rpc('santa_geocode_claim');
 if(gateError||!permit)return false;
 const url=new URL('https://nominatim.openstreetmap.org/search');
 url.searchParams.set('q',address);url.searchParams.set('format','jsonv2');
 url.searchParams.set('limit','1');url.searchParams.set('countrycodes','it');
 url.searchParams.set('addressdetails','0');
 try{
  const response=await fetch(url.toString(),{
   headers:{'User-Agent':'CroceRossaMonza-Natale/2026 (natale@crimonza.org)',
    'Accept':'application/json','Referer':'https://natale.crimonza.org/'},
   signal:AbortSignal.timeout(7000),
  });
  if(!response.ok)return false;
  const hits=await response.json() as Array<{lat?:string;lon?:string;display_name?:string}>;
  const lat=Number(hits[0]?.lat),lon=Number(hits[0]?.lon);
  // Regional safety bound: never pin another city with a similar street.
  if(!hits.length||!Number.isFinite(lat)||!Number.isFinite(lon)||
     lat<45.4||lat>45.76||lon<9.0||lon>9.62){
   await db.from('santa_geocode_cache').upsert({address_key:key,latitude:null,
    longitude:null,result:'unavailable',updated_at:new Date().toISOString()});
   return apply({latitude:null,longitude:null,result:'unavailable'});
  }
  await db.from('santa_geocode_cache').upsert({address_key:key,
   latitude:lat,longitude:lon,result:'located',updated_at:new Date().toISOString()});
  return apply({latitude:lat,longitude:lon,result:'located'});
 }catch{return false;}
}
