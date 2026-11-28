import {createServerFn} from '@tanstack/react-start';
import {getRequestHeader} from '@tanstack/react-start/server';
import {z} from 'zod';
import {santaOriginAllowed} from './santa-security';
import {sha256Hex} from './volunteer-auth';
import type {SantaMode} from './santa-planner';

const adult=z.string().trim().min(2).max(80).regex(/^[\p{L}\p{M} .'\-’]+$/u,'Usa soltanto lettere.');
const childName=z.string().trim().min(2).max(60).regex(/^[\p{L}\p{M} .'\-’]+$/u,'Inserisci nome e cognome.');
const childSchema=z.object({
 nome:childName,cognome:childName,
 soprannome:z.string().trim().max(40),
 eta:z.number().int().min(0).max(120),
}).strict();
const bookingInput=z.object({
 requestId:z.string().uuid(),
 nome:adult,cognome:adult,email:z.string().trim().email().max(254),
 telefono:z.string().trim().regex(/^\+?[0-9 ()-]{7,24}$/,'Numero di telefono non valido.'),
 indirizzo:z.string().trim().min(6).max(180),
 localita:z.string().trim().min(2).max(80),
 piano:z.string().trim().min(1).max(60),
 dettagliAccesso:z.string().trim().max(240),
 bambiniDettagli:z.array(childSchema).min(1).max(8),
 note:z.string().trim().max(500),
 offertaCents:z.number().int().min(3000).max(100000),
 privacyAcknowledged:z.literal(true),
 website:z.string().max(0).default(''),
}).strict();
async function db(){
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 return supabaseAdmin as unknown as {from:(table:string)=>any};
}
function guard(){
 if(!santaOriginAllowed(getRequestHeader('origin')??null))
  throw new Error('La richiesta deve provenire dal sito di Natale.');
}
export const santaPublicSettings=createServerFn({method:'GET'}).handler(async()=>{
 const {data,error}=await (await db()).from('santa_admin_settings')
  .select('mode,requests_open,min_offerta_cents,event_day')
  .eq('singleton',true).single();
 if(error||!data)throw new Error('Servizio temporaneamente non disponibile.');
 return {
  mode:data.mode as SantaMode,
  requestsOpen:Boolean(data.requests_open),
  minContributionEuros:Number(data.min_offerta_cents)/100,
  date:String(data.event_day),
 };
});
export const santaCreateRequest=createServerFn({method:'POST'})
 .inputValidator(d=>bookingInput.parse(d))
 .handler(async({data})=>{
  guard();
  const client=await db();
  const {data:settings,error:setError}=await client.from('santa_admin_settings')
   .select('mode,requests_open,min_offerta_cents,event_day').eq('singleton',true).single();
  if(setError||!settings?.requests_open)
   throw new Error('Le richieste non sono disponibili in questo momento.');
  if(data.offertaCents<settings.min_offerta_cents)
   throw new Error('L’importo deve rispettare l’offerta minima.');
  const rawIp=getRequestHeader('cf-connecting-ip')??getRequestHeader('x-real-ip')??'unknown';
  const key=await sha256Hex('santa-booking:'+rawIp);
  const recent=await client.from('santa_bookings').select('id',{count:'exact',head:true})
   .eq('client_key',key).gte('created_at',new Date(Date.now()-30*60*1000).toISOString());
  if(recent.error)throw new Error('Impossibile verificare la richiesta.');
  if((recent.count??0)>=20)throw new Error('Troppe richieste ravvicinate. Contatta natale@crimonza.org.');
  // Request-ID and hash protect against double taps/network retries.
  const old=await client.from('santa_bookings').select('id,mode,client_key')
   .eq('request_id',data.requestId).maybeSingle();
  if(old.data){
   if(old.data.client_key!==key)throw new Error('Richiesta già registrata.');
   return {id:old.data.id as string,mode:old.data.mode as SantaMode};
  }
  const {data:booking,error}=await client.from('santa_bookings').insert({
   event_day:settings.event_day,mode:settings.mode,request_id:data.requestId,
   client_key:key,nome:data.nome,cognome:data.cognome,
   email:data.email.toLowerCase(),telefono:data.telefono,
   indirizzo:data.indirizzo,localita:data.localita,
   piano:data.piano,dettagli_accesso:data.dettagliAccesso,
   bambini:data.bambiniDettagli.map(b=>[b.nome,b.cognome].join(' ')),
   bambini_dettagli:data.bambiniDettagli,
   note:data.note,quota_offerta_cents:data.offertaCents,
   quota_incassata_cents:0,status:'richiesta',
   squadra:null,team_position:null,confirmed_time:null,
   slot_preferito:'indifferente',slot_assegnato:null,
   privacy_accepted_at:new Date().toISOString(),
   geocode_status:'pending',
  }).select('id,mode').single();
  if(error||!booking){
   // Rare concurrent duplicate: do not produce a second request.
   const retry=await client.from('santa_bookings').select('id,mode,client_key')
    .eq('request_id',data.requestId).maybeSingle();
   if(retry.data?.client_key===key)return {id:retry.data.id as string,mode:retry.data.mode as SantaMode};
   throw new Error('La richiesta non è stata registrata. Riprova.');
  }
  const {deliverSantaEmail}=await import('./santa-mail.server');
  const {locateSantaBooking}=await import('./santa-geocode.server');
  await Promise.allSettled([
   deliverSantaEmail(booking.id,'request'),
   locateSantaBooking(booking.id),
  ]);
  return {id:booking.id as string,mode:booking.mode as SantaMode};
 });
