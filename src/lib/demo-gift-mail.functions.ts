import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { CAMPAIGN } from './campaign';
import { ONLINE_GIFT } from './site-experience';
import { PROJECTS } from './data';
import { demoGiftMailInput,giftMailClaimId } from './demo-gift-mail-policy';

export const sendDemoGiftMail=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(d=>demoGiftMailInput.parse(d)).handler(async({data,context})=>{
  if(!ONLINE_GIFT || !CAMPAIGN.demo)throw new Error('Prova disponibile solo nella DEMO online.');
  const {requireEmailQa}=await import('./email-qa-auth.server');
  await requireEmailQa(context.supabase,context.userId);
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  // The server-created ornament proves completed simulation. No client payment-success flag.
  const {data:row,error}=await supabaseAdmin.from('demo_ornaments').select('id,kind,amount_cents').eq('id',data.ornamentId).eq('online_request_id',data.giftRequestId).eq('client_id',data.client).single();
  if(error || !row)throw new Error('Completa prima la simulazione: pallina non disponibile per questa richiesta.');
  const project=PROJECTS.find(p=>p.ornament===row.kind);
  if(!project || row.amount_cents===null)throw new Error('Progetto non disponibile.');
  const {DEMO_EMAIL_QA,gmailQaIdentity,runDemoEmailQa,sendGmailQa}=await import('./demo-email-qa.server');
  const identity=await gmailQaIdentity();
  const requestId=await giftMailClaimId(row.id,data.kind);
  return runDemoEmailQa({authorized:true,demo:true,enabled:DEMO_EMAIL_QA.enabled,senderVerified:identity,
    claim:async()=>{const r=await supabaseAdmin.rpc('claim_staff_gmail_qa',{p_actor:context.userId,p_request:requestId,p_kind:data.kind});if(r.error)throw new Error('Registro QA non disponibile: nessun invio.');return r.data;},
    send:(_recipient,attempt)=>sendGmailQa(data.kind,attempt,{projectTitle:project.title,amount:row.amount_cents===null?0:row.amount_cents/100,ornamentId:row.id,donor:data.donor,toName:data.toName,msg:data.msg}),
    finish:async(attempt,r)=>{const f=await supabaseAdmin.rpc('finish_staff_gmail_qa',{p_id:attempt,p_state:r.state,...(r.messageId?{p_message:r.messageId}:{}),...(r.status!==undefined?{p_status:r.status}:{})});if(f.error)throw new Error('Esito incerto: non ripetere, controlla la casella e il registro.');}
  });
});