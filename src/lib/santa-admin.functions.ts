import {createServerFn} from '@tanstack/react-start';
import {getCookie,setCookie,deleteCookie,getRequestHeader} from '@tanstack/react-start/server';
import {z} from 'zod';
import {b64url,sha256Hex,verifyPassword} from './volunteer-auth';
import {santaOriginAllowed} from './santa-security';
import type {SantaBooking,SantaMode,SantaStatus,SantaTeamId} from './santa-planner';

const COOKIE='cri_santa_admin';
const AGE=6*3600;
const cookieOptions={httpOnly:true,secure:true,sameSite:'lax' as const,path:'/',maxAge:AGE};
const emailSchema=z.string().trim().toLowerCase().email().max(254);
const loginSchema=z.object({email:emailSchema,password:z.string().min(1).max(200)}).strict();
const statuses=['richiesta','confermata','completata','annullata'] as const;
const teams=['Squadra A','Squadra B','Squadra C','Squadra D'] as const;
const time=z.string().regex(/^(19|20|21|22|23):[0-5][0-9]$/);
function csrf(){
 if(!santaOriginAllowed(getRequestHeader('origin')??null))
  throw new Error('Origine non autorizzata. Apri la preview direttamente nel browser e riprova.');
}
async function adminDb(){
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 return supabaseAdmin as unknown as {from:(table:string)=>any;rpc:(name:string,args?:any)=>Promise<any>};
}
const unavailable='Email o password non valide, oppure accesso non abilitato.';
async function currentAdmin(){
 const cookie=getCookie(COOKIE);
 if(!cookie||!/^[A-Za-z0-9_-]{40,64}$/.test(cookie))
  throw new Error('Sessione scaduta.');
 const db=await adminDb();
 const {data,error}=await db.from('santa_admin_sessions').select('email,expires_at')
  .eq('token_hash',await sha256Hex(cookie)).gt('expires_at',new Date().toISOString()).maybeSingle();
 if(error||!data?.email)throw new Error('Sessione non valida.');
 const allowed=await db.from('santa_admin_allowlist').select('enabled')
  .eq('email',data.email).maybeSingle();
 if(allowed.error||!allowed.data?.enabled)throw new Error('Accesso revocato.');
 return data.email as string;
}
export const santaAdminLogin=createServerFn({method:'POST'})
 .inputValidator(d=>loginSchema.parse(d)).handler(async({data})=>{
  csrf();
  const db=await adminDb();
  const ip=getRequestHeader('cf-connecting-ip')??getRequestHeader('x-real-ip')??'unknown';
  const key=await sha256Hex('santa-login:'+ip);
  const after=new Date(Date.now()-15*60*1000).toISOString();
  const recent=await db.from('santa_admin_login_attempts').select('id',{count:'exact',head:true})
   .eq('client_key',key).gte('attempted_at',after);
  if(recent.error)return {ok:false as const,error:'Accesso momentaneamente non disponibile.'};
  if((recent.count??0)>=6)return {ok:false as const,error:'Troppi tentativi. Riprova più tardi.'};
  const [settings,allow]=await Promise.all([
   db.from('santa_admin_settings').select('password_verifier').eq('singleton',true).maybeSingle(),
   db.from('santa_admin_allowlist').select('enabled').eq('email',data.email).maybeSingle(),
  ]);
  const verifier=settings.data?.password_verifier as string|undefined;
  const valid=Boolean(verifier&&allow.data?.enabled&&await verifyPassword(data.password,verifier));
  await db.from('santa_admin_login_attempts').insert({client_key:key,successful:valid});
  if(!valid)return {ok:false as const,error:unavailable};
  const token=b64url(crypto.getRandomValues(new Uint8Array(32)));
  const session=await db.from('santa_admin_sessions').insert({
   token_hash:await sha256Hex(token),email:data.email,
   expires_at:new Date(Date.now()+AGE*1000).toISOString(),
  });
  if(session.error)return {ok:false as const,error:'Impossibile aprire la sessione.'};
  setCookie(COOKIE,token,cookieOptions);
  return {ok:true as const,email:data.email};
 });
export const santaAdminMe=createServerFn({method:'GET'}).handler(async()=>{
 try{return {email:await currentAdmin()};}catch{return null;}
});
export const santaAdminLogout=createServerFn({method:'POST'}).handler(async()=>{
 csrf();
 const cookie=getCookie(COOKIE);
 if(cookie)await (await adminDb()).from('santa_admin_sessions').delete()
  .eq('token_hash',await sha256Hex(cookie));
 deleteCookie(COOKIE,{httpOnly:true,secure:true,path:'/',sameSite:'lax'});
 return {ok:true as const};
});
const rowSchema=z.object({
 id:z.string().uuid(),mode:z.enum(['demo','live']),
 nome:z.string(),cognome:z.string(),email:z.string(),telefono:z.string(),
 indirizzo:z.string(),localita:z.string(),bambini:z.array(z.string()),note:z.string(),
 quota_offerta_cents:z.number(),quota_incassata_cents:z.number(),
 squadra:z.enum(teams).nullable(),team_position:z.number().nullable(),
 confirmed_time:z.string().nullable(),status:z.enum(statuses),
 latitude:z.number().nullable(),longitude:z.number().nullable(),
 geocode_status:z.enum(['pending','located','approximate','unavailable']),
}).passthrough();
const fields='id,mode,nome,cognome,email,telefono,indirizzo,localita,bambini,note,quota_offerta_cents,quota_incassata_cents,squadra,team_position,confirmed_time,status,latitude,longitude,geocode_status';
function toBooking(r:z.infer<typeof rowSchema>):SantaBooking{
 return {
  id:r.id,mode:r.mode as SantaMode,nome:r.nome,cognome:r.cognome,email:r.email,
  telefono:r.telefono,indirizzo:r.indirizzo,localita:r.localita,bambini:r.bambini,
  note:r.note,quotaOffertaCents:r.quota_offerta_cents,
  quotaIncassataCents:r.quota_incassata_cents,squadra:r.squadra as SantaTeamId|null,
  teamPosition:r.team_position,confirmedTime:r.confirmed_time,
  status:r.status as SantaStatus,lat:r.latitude,lon:r.longitude,
  geocodeStatus:r.geocode_status,
 };
}
export type SantaAdminOverview={
 bookings:SantaBooking[];version:number;mode:SantaMode;requestsOpen:boolean;
};
export const santaAdminList=createServerFn({method:'POST'}).handler(async():Promise<SantaAdminOverview>=>{
 csrf();await currentAdmin();
 const db=await adminDb();
 const config=await db.from('santa_admin_settings').select('mode,board_version,requests_open')
  .eq('singleton',true).single();
 if(config.error||!config.data)throw new Error('Servizio non disponibile.');
 const rows=await db.from('santa_bookings').select(fields)
  .eq('mode',config.data.mode).order('created_at',{ascending:true}).limit(250);
 if(rows.error)throw new Error('Impossibile caricare le richieste.');
 return {bookings:z.array(rowSchema).parse(rows.data??[]).map(toBooking),
  version:Number(config.data.board_version),mode:config.data.mode as SantaMode,
  requestsOpen:Boolean(config.data.requests_open)};
});
const boardSchema=z.object({
 version:z.number().int().min(0),
 assignments:z.array(z.object({
  id:z.string().uuid(),
  team:z.enum(teams).nullable(),
  position:z.number().int().min(1).max(12).nullable(),
 })).max(250),
}).strict();
export const santaAdminBoardSave=createServerFn({method:'POST'})
 .inputValidator(d=>boardSchema.parse(d))
 .handler(async({data})=>{
  csrf();const actor=await currentAdmin();
  const db=await adminDb();
  const res=await db.rpc('santa_board_save',{
   _actor:actor,_expected:data.version,_assignments:data.assignments,
  });
  if(res.error)throw new Error('Lavagna modificata altrove o assegnazioni non valide: aggiorna e riprova.');
  return {version:Number(res.data)};
 });
const detailsSchema=z.object({
 id:z.string().uuid(),
 patch:z.object({
  nome:z.string().trim().min(2).max(80).optional(),
  cognome:z.string().trim().min(2).max(80).optional(),
  email:emailSchema.optional(),
  telefono:z.string().trim().min(6).max(30).optional(),
  indirizzo:z.string().trim().min(6).max(180).optional(),
  localita:z.string().trim().min(2).max(80).optional(),
  bambini:z.array(z.string().trim().min(1).max(40)).min(1).max(8).optional(),
  note:z.string().max(500).optional(),
  quotaOffertaCents:z.number().int().min(3000).max(100000).optional(),
  quotaIncassataCents:z.number().int().min(0).max(100000).optional(),
  confirmedTime:time.nullable().optional(),
  status:z.enum(statuses).optional(),
  lat:z.number().min(-90).max(90).nullable().optional(),
  lon:z.number().min(-180).max(180).nullable().optional(),
 }).strict(),
}).strict();
const columns:Record<string,string>={
 nome:'nome',cognome:'cognome',email:'email',telefono:'telefono',
 indirizzo:'indirizzo',localita:'localita',bambini:'bambini',note:'note',
 quotaOffertaCents:'quota_offerta_cents',quotaIncassataCents:'quota_incassata_cents',
 confirmedTime:'confirmed_time',status:'status',lat:'latitude',lon:'longitude',
};
export const santaAdminUpdate=createServerFn({method:'POST'})
 .inputValidator(d=>detailsSchema.parse(d)).handler(async({data}):Promise<SantaBooking>=>{
  csrf();const actor=await currentAdmin(),db=await adminDb();
  const config=await db.from('santa_admin_settings').select('mode').eq('singleton',true).single();
  if(!config.data)throw new Error('Servizio non disponibile.');
  const patch:Record<string,unknown>={};
  for(const [key,value] of Object.entries(data.patch))if(value!==undefined)patch[columns[key]!]=value;
  if(!Object.keys(patch).length)throw new Error('Nessuna modifica.');
  const before=await db.from('santa_bookings').select('status,squadra,team_position,confirmed_time,indirizzo,localita')
   .eq('id',data.id).eq('mode',config.data.mode).maybeSingle();
  if(!before.data)throw new Error('Richiesta non trovata.');
  const status=patch['status']??before.data.status;
  const confirmedTime=patch['confirmed_time']===undefined?before.data.confirmed_time:patch['confirmed_time'];
  if((status==='confermata'||status==='completata')&&(!before.data.squadra||
    !before.data.team_position||!confirmedTime))
    throw new Error('Prima assegna una squadra, poi inserisci l’orario definitivo.');
  if(patch['indirizzo']!==undefined||patch['localita']!==undefined){
   patch['latitude']=null;patch['longitude']=null;patch['geocode_status']='pending';
  }
  const res=await db.from('santa_bookings').update(patch).eq('id',data.id)
   .eq('mode',config.data.mode).select(fields).single();
  if(res.error||!res.data)throw new Error('Modifiche non salvate.');
  await db.from('santa_admin_audit').insert({
   actor_email:actor,booking_id:data.id,action:'booking_edited',
   changed:{fields:Object.keys(patch),status:status},
  });
  if(patch['indirizzo']!==undefined||patch['localita']!==undefined){
   const {locateSantaBooking}=await import('./santa-geocode.server');
   await locateSantaBooking(data.id);
  }
  if(before.data.status!=='confermata'&&status==='confermata'){
   const {deliverSantaEmail}=await import('./santa-mail.server');
   await deliverSantaEmail(data.id,'confirmed');
  }
  const reread=await db.from('santa_bookings').select(fields).eq('id',data.id).single();
  return toBooking(rowSchema.parse(reread.data??res.data));
 });
export const santaAdminLocate=createServerFn({method:'POST'})
 .inputValidator(d=>z.object({id:z.string().uuid()}).parse(d))
 .handler(async({data})=>{
  csrf();await currentAdmin();
  const {locateSantaBooking}=await import('./santa-geocode.server');
  return {located:await locateSantaBooking(data.id)};
 });
