import { createServerFn } from '@tanstack/react-start';
import {getCookie,setCookie,deleteCookie,getRequest,getRequestHeader} from '@tanstack/react-start/server';
import {z} from 'zod';
import {b64url,sha256Hex,verifyPassword} from './volunteer-auth';
import type {SantaBooking,SantaStatus,SantaSlot} from './santa-planner';

const COOKIE='cri_santa_admin';
const SESSION_AGE=6*3600;
const cookieOptions={httpOnly:true,secure:true,sameSite:'lax' as const,path:'/',maxAge:SESSION_AGE};
const emailSchema=z.string().email().max(254).transform(x=>x.trim().toLowerCase());
const loginSchema=z.object({email:emailSchema,password:z.string().min(1).max(200)}).strict();
const slots=['19:30','20:30','21:30','22:30'] as const;
const statuses=['richiesta','confermata','completata','annullata'] as const;

async function adminDb(){
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 // New private tables are introduced in an additive SQL migration;
 // generated Supabase Database types are not regenerated until deploy.
 return supabaseAdmin as unknown as {
  from:(table:string)=>any;
 };
}
function csrfGuard(){
 const origin=getRequestHeader('origin');
 if(!origin)return;
 try{if(new URL(origin).host!==new URL(getRequest().url).host)throw new Error('Origine non autorizzata');}
 catch{throw new Error('Origine non autorizzata');}
}
const errorText='Credenziali non valide o account non autorizzato.';
async function currentAdmin(){
 const cookie=getCookie(COOKIE);
 if(!cookie||!(/^[A-Za-z0-9_-]{40,64}$/.test(cookie)))throw new Error('Sessione non disponibile.');
 const db=await adminDb(),h=await sha256Hex(cookie);
 const {data,error}=await db.from('santa_admin_sessions')
  .select('email,expires_at').eq('token_hash',h).gt('expires_at',new Date().toISOString()).maybeSingle();
 if(error||!data?.email)throw new Error('Sessione non valida.');
 const {data:allowed,error:blocked}=await db.from('santa_admin_allowlist')
  .select('enabled').eq('email',data.email).maybeSingle();
 if(blocked||!allowed?.enabled)throw new Error('Accesso non autorizzato.');
 return data.email as string;
}
export const santaAdminLogin=createServerFn({method:'POST'})
 .inputValidator(data=>loginSchema.parse(data))
 .handler(async({data})=>{
  csrfGuard();
  const db=await adminDb();
  const ip=getRequestHeader('cf-connecting-ip')??getRequestHeader('x-real-ip')??'unknown';
  const key=await sha256Hex('santa:login:'+ip);
  const since=new Date(Date.now()-15*60*1000).toISOString();
  const {count,error:countError}=await db.from('santa_admin_login_attempts')
    .select('id',{count:'exact',head:true}).eq('client_key',key).gte('attempted_at',since);
  if(countError)return {ok:false as const,error:'Accesso non disponibile.'};
  if((count??0)>=6)return {ok:false as const,error:'Troppi tentativi. Riprova più tardi.'};
  const {data:settings}=await db.from('santa_admin_settings')
    .select('password_verifier').eq('singleton',true).maybeSingle();
  const verifier=settings?.password_verifier as string|undefined;
  // Always verify server-side; the verifier and allowlist never reach the browser.
  const passwordValid=!!verifier&&await verifyPassword(data.password,verifier);
  const {data:allowed}=await db.from('santa_admin_allowlist')
    .select('enabled').eq('email',data.email).maybeSingle();
  const valid=Boolean(passwordValid&&allowed?.enabled);
  await db.from('santa_admin_login_attempts').insert({client_key:key,successful:valid});
  if(!valid)return {ok:false as const,error:errorText};
  const token=b64url(crypto.getRandomValues(new Uint8Array(32)));
  const {error}=await db.from('santa_admin_sessions').insert({
   token_hash:await sha256Hex(token),email:data.email,
   expires_at:new Date(Date.now()+SESSION_AGE*1000).toISOString(),
  });
  if(error)return {ok:false as const,error:'Accesso temporaneamente indisponibile.'};
  setCookie(COOKIE,token,cookieOptions);
  return {ok:true as const,email:data.email};
 });
export const santaAdminMe=createServerFn({method:'GET'}).handler(async()=>{
 try{return {email:await currentAdmin()};}catch{return null;}
});
export const santaAdminLogout=createServerFn({method:'POST'}).handler(async()=>{
 csrfGuard();
 const cookie=getCookie(COOKIE);
 if(cookie){
  const db=await adminDb();
  await db.from('santa_admin_sessions').delete().eq('token_hash',await sha256Hex(cookie));
 }
 deleteCookie(COOKIE,{path:'/',httpOnly:true,secure:true,sameSite:'lax'});
 return {ok:true};
});
const bookingRow=z.object({
 id:z.string().uuid(),nome:z.string(),cognome:z.string(),email:z.string(),
 telefono:z.string(),indirizzo:z.string(),localita:z.string(),bambini:z.array(z.string()),
 note:z.string(),quota_offerta_cents:z.number(),quota_incassata_cents:z.number(),
 slot_preferito:z.string(),slot_assegnato:z.string().nullable(),
 squadra:z.string().nullable(),status:z.string(),
 latitude:z.number().nullable(),longitude:z.number().nullable(),
}).passthrough();
function toBooking(r:z.infer<typeof bookingRow>):SantaBooking{
 return {id:r.id,nome:r.nome,cognome:r.cognome,email:r.email,
  telefono:r.telefono,indirizzo:r.indirizzo,localita:r.localita,
  bambini:r.bambini,note:r.note,
  quotaOffertaCents:r.quota_offerta_cents,quotaIncassataCents:r.quota_incassata_cents,
  slotPreferito:r.slot_preferito as SantaSlot|'indifferente',
  slotAssegnato:r.slot_assegnato as SantaSlot|null,squadra:r.squadra,
  status:r.status as SantaStatus,lat:r.latitude,lon:r.longitude};
}
export const santaAdminList=createServerFn({method:'POST'}).handler(async():Promise<SantaBooking[]>=>{
 csrfGuard();
 await currentAdmin();
 const db=await adminDb();
 const {data,error}=await db.from('santa_bookings').select(
  'id,nome,cognome,email,telefono,indirizzo,localita,bambini,note,quota_offerta_cents,quota_incassata_cents,slot_preferito,slot_assegnato,squadra,status,latitude,longitude'
 ).order('created_at',{ascending:false}).limit(250);
 if(error)throw new Error('Elenco richieste non disponibile.');
 return z.array(bookingRow).parse(data??[]).map(toBooking);
});
const updateSchema=z.object({
 id:z.string().uuid(),
 patch:z.object({
  nome:z.string().trim().min(2).max(80).optional(),
  cognome:z.string().trim().min(2).max(80).optional(),
  email:emailSchema.optional(),telefono:z.string().min(6).max(30).optional(),
  indirizzo:z.string().trim().min(6).max(180).optional(),
  localita:z.string().trim().min(2).max(80).optional(),
  bambini:z.array(z.string().trim().min(1).max(40)).min(1).max(8).optional(),
  note:z.string().max(500).optional(),
  quotaOffertaCents:z.number().int().min(3000).max(100000).optional(),
  quotaIncassataCents:z.number().int().min(0).max(100000).optional(),
  slotPreferito:z.enum([...slots,'indifferente']).optional(),
  slotAssegnato:z.enum(slots).nullable().optional(),
  squadra:z.string().regex(/^Squadra [A-Z]$/).nullable().optional(),
  status:z.enum(statuses).optional(),
  lat:z.number().min(-90).max(90).nullable().optional(),
  lon:z.number().min(-180).max(180).nullable().optional(),
 }).strict(),
}).strict();
const columns:Record<string,string>={
 nome:'nome',cognome:'cognome',email:'email',telefono:'telefono',
 indirizzo:'indirizzo',localita:'localita',bambini:'bambini',note:'note',
 quotaOffertaCents:'quota_offerta_cents',quotaIncassataCents:'quota_incassata_cents',
 slotPreferito:'slot_preferito',slotAssegnato:'slot_assegnato',
 squadra:'squadra',status:'status',lat:'latitude',lon:'longitude',
};
export const santaAdminUpdate=createServerFn({method:'POST'})
 .inputValidator(data=>updateSchema.parse(data))
 .handler(async({data}):Promise<SantaBooking>=>{
  csrfGuard();const actor=await currentAdmin(),db=await adminDb();
  const patch:Record<string,unknown>={};
  for(const [key,value] of Object.entries(data.patch))if(value!==undefined)patch[columns[key]!]=value;
  if(!Object.keys(patch).length)throw new Error('Nessuna modifica da salvare.');
  const {data:before}=await db.from('santa_bookings').select('status,slot_assegnato,squadra')
   .eq('id',data.id).maybeSingle();
  if(!before)throw new Error('Richiesta non trovata.');
  const nextStatus=patch['status']??before.status;
  const nextSlot=patch['slot_assegnato']===undefined?before.slot_assegnato:patch['slot_assegnato'];
  const nextTeam=patch['squadra']===undefined?before.squadra:patch['squadra'];
  if((nextStatus==='confermata'||nextStatus==='completata')&&(!nextSlot||!nextTeam))
   throw new Error('Assegna squadra e orario prima di confermare.');
  // A donation is counted as received only after manual confirmation by staff.
  const {data:row,error}=await db.from('santa_bookings').update(patch).eq('id',data.id)
   .select('id,nome,cognome,email,telefono,indirizzo,localita,bambini,note,quota_offerta_cents,quota_incassata_cents,slot_preferito,slot_assegnato,squadra,status,latitude,longitude').single();
  if(error||!row)throw new Error('Modifica non salvata.');
  await db.from('santa_admin_audit').insert({actor_email:actor,booking_id:data.id,
   action:'booking_update',changed:{keys:Object.keys(patch)}});
  return toBooking(bookingRow.parse(row));
 });
