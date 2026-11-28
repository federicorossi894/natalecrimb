/** Exactly-once-claimed Santa mail delivery.
 * DEMO sends only to addresses on the organizer allowlist, never to
 * arbitrary demo addresses. In LIVE: all validated customer recipients.
 * Ambiguous provider outcomes remain uncertain and are never retried silently.
 */
import {supabaseAdmin} from '@/integrations/supabase/client.server';
import {santaConfirmedEmail,santaRequestEmail,SANTA_SENDER} from './santa-mail';
const b64=(s:string)=>btoa(Array.from(new TextEncoder().encode(s),b=>String.fromCharCode(b)).join(''));
const b64url=(s:string)=>b64(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
type Kind='request'|'confirmed';
type Result='accepted'|'failed'|'uncertain'|'suppressed'|'already_processed';
const db=supabaseAdmin as unknown as {from:(table:string)=>any};
export async function deliverSantaEmail(bookingId:string,kind:Kind):Promise<Result>{
 const {data:claim,error:claimError}=await db.from('santa_mail_outbox')
  .update({state:'sending',claimed_at:new Date().toISOString()})
  .eq('booking_id',bookingId).eq('kind',kind).eq('state','queued')
  .select('id,mode').maybeSingle();
 if(claimError||!claim)return 'already_processed';
 const finish=async(state:Result,messageId?:string)=>{
  await db.from('santa_mail_outbox').update({state,message_id:messageId??null})
   .eq('id',claim.id).eq('state','sending');
  return state;
 };
 const {data:b,error:readError}=await db.from('santa_bookings')
  .select('id,mode,status,nome,cognome,email,indirizzo,localita,piano,dettagli_accesso,quota_offerta_cents,confirmed_time')
  .eq('id',bookingId).maybeSingle();
 if(readError||!b)return finish('failed');
 if(kind==='confirmed'&&(b.status!=='confermata'&&b.status!=='completata'||!b.confirmed_time))
  return finish('suppressed');
 if(b.mode!==claim.mode)return finish('failed');
 if(b.mode==='demo'){
  const {data:allowed}=await db.from('santa_admin_allowlist')
   .select('enabled').eq('email',String(b.email).trim().toLowerCase()).maybeSingle();
  if(!allowed?.enabled)return finish('suppressed');
 }
 const mail=kind==='request'
  ?santaRequestEmail({nome:b.nome,quotaOffertaCents:b.quota_offerta_cents})
  :santaConfirmedEmail({nome:b.nome,confirmedTime:b.confirmed_time,
    indirizzo:b.indirizzo,localita:b.localita,piano:b.piano,dettagliAccesso:b.dettagli_accesso});
 const key=process.env['GOOGLE_MAIL_API_KEY_1'];
 const auth=process.env['LOVABLE_API_KEY'];
 if(!key||!auth)return finish('failed');
 // The connected Gmail identity must really be the CRI account, not just a
 // display name in the MIME header.
 const {gmailQaIdentity}=await import('./demo-email-qa.server');
 if(!(await gmailQaIdentity()))return finish('failed');
 const id=String(claim.id);
 const raw=b64url([
  'From: Croce Rossa Monza Natale <'+SANTA_SENDER+'>',
  'To: <'+b.email+'>',
  'Reply-To: '+SANTA_SENDER,
  'Subject: =?UTF-8?B?'+b64(mail.subject)+'?=',
  'Message-ID: <santa-'+id+'@crimonza.org>',
  'MIME-Version: 1.0','Content-Type: text/html; charset="UTF-8"',
  'Content-Transfer-Encoding: base64','',b64(mail.html),
 ].join('\r\n'));
 try{
  const response=await fetch('https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send',{
   method:'POST',
   headers:{Authorization:'Bearer '+auth,'X-Connection-Api-Key':key,'Content-Type':'application/json'},
   body:JSON.stringify({raw}),signal:AbortSignal.timeout(15000),
  });
  if(!response.ok)return finish(response.status>=500?'uncertain':'failed');
  const result=await response.json() as {id?:string};
  return result.id?finish('accepted',result.id):finish('uncertain');
 }catch{return finish('uncertain');}
}
