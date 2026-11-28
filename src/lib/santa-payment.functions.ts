/** Babbo Natale: payment identity is the booking-linked provider attempt,
 * never an unrelated donation made on the existing /regali pages.
 * All real checkout actions are gated by an explicit DB activation and
 * the official natale.crimonza.org origin. DEMO creates NO charges.
 */
import {createServerFn} from '@tanstack/react-start';
import {getRequest,getRequestHeader} from '@tanstack/react-start/server';
import {z} from 'zod';
import {CAMPAIGN} from './campaign';
import {santaOriginAllowed} from './santa-security';
import {paymentOrigin} from './payment-deployment';
import {decimalCents} from './payment-policy';
import {sumup,paypal} from './payments.server';
import {supabaseAdmin} from '@/integrations/supabase/client.server';
const db=supabaseAdmin as unknown as {from:(name:string)=>any;rpc:(name:string,values:Record<string,unknown>)=>Promise<any>};
const tokenSchema=z.string().uuid();
const providerSchema=z.enum(['paypal','sumup']);
type Provider=z.infer<typeof providerSchema>;
function csrf(){if(!santaOriginAllowed(getRequestHeader('origin')??null))throw new Error('Origine non autorizzata.');}
async function lookup(token:string){
 const key=tokenSchema.parse(token);
 const {data:link,error}=await db.from('santa_payment_links').select('booking_id').eq('token',key).maybeSingle();
 if(error||!link)throw new Error('Collegamento non valido.');
 const [booking,settings]=await Promise.all([
  db.from('santa_bookings').select('id,nome,mode,status,confirmed_time,quota_offerta_cents,quota_incassata_cents,payment_state').eq('id',link.booking_id).maybeSingle(),
  db.from('santa_admin_settings').select('mode,online_checkout_enabled').eq('singleton',true).single(),
 ]);
 if(booking.error||settings.error||!booking.data||!settings.data)
  throw new Error('Prenotazione non disponibile.');
 if(booking.data.mode!==settings.data.mode||booking.data.status!=='confermata')
  throw new Error('Prenotazione non disponibile.');
 return {b:booking.data,c:settings.data};
}
export const santaPaymentDetails=createServerFn({method:'GET'})
 .inputValidator(data=>z.object({token:tokenSchema}).strict().parse(data))
 .handler(async({data})=>{
  const {b,c}=await lookup(data.token);
  return {
   nome:String(b.nome),amountCents:Number(b.quota_offerta_cents),
   paidCents:Number(b.quota_incassata_cents),
   time:String(b.confirmed_time),state:String(b.payment_state),
   mode:c.mode as 'demo'|'live',onlineEnabled:
    c.mode==='live'&&Boolean(c.online_checkout_enabled)&&CAMPAIGN.livePayments,
  };
 });
export const santaStartCheckout=createServerFn({method:'POST'})
 .inputValidator(data=>z.object({token:tokenSchema,provider:providerSchema}).strict().parse(data))
 .handler(async({data})=>{
  csrf();
  const origin=paymentOrigin(getRequest().url); // preview and staging cannot charge
  const {b,c}=await lookup(data.token);
  if(c.mode!=='live'||!c.online_checkout_enabled||!CAMPAIGN.livePayments)
   throw new Error('Il pagamento online non è ancora disponibile.');
  if(b.payment_state==='pagato_online'||b.payment_state==='pagato_bonifico')
   throw new Error('Contributo già registrato come pagato.');
  const amount=Number(b.quota_offerta_cents);
  if(!Number.isInteger(amount)||amount<3000||amount>100000||amount%100)
   throw new Error('Importo non valido.');
  const old=await db.from('santa_payment_attempts').select('id,status,provider,checkout_url,amount_cents')
   .eq('booking_id',b.id).order('created_at',{ascending:false}).limit(5);
  if(old.error)throw new Error('Verifica pagamento non disponibile.');
  const paid=(old.data??[]).find((a:any)=>a.status==='paid');
  if(paid)throw new Error('Pagamento già registrato.');
  const pending=(old.data??[]).find((a:any)=>a.status==='pending'||a.status==='creating'||a.status==='uncertain');
  if(pending){
   if(pending.provider===data.provider&&pending.checkout_url&&pending.amount_cents===amount)
    return {url:pending.checkout_url as string};
   throw new Error('Un pagamento è già in verifica. Non iniziare un secondo pagamento.');
  }
  const attempt=await db.from('santa_payment_attempts').insert({
   booking_id:b.id,provider:data.provider,amount_cents:amount,status:'creating',
  }).select('id').single();
  if(attempt.error||!attempt.data)throw new Error('Richiesta di pagamento già in corso.');
  const id=String(attempt.data.id);
  const returnUrl=origin+'/babbo-natale/pagamento?token='+data.token+'&ritorno=1';
  let providerId:string,checkoutUrl:string;
  if(data.provider==='sumup'){
   const me=z.object({merchant_profile:z.object({merchant_code:z.string().min(1)})})
    .parse(await sumup('/v0.1/me'));
   const checkout=z.object({id:z.string(),hosted_checkout_url:z.string().url()})
    .parse(await sumup('/v0.1/checkouts','POST',{
     amount:amount/100,currency:'EUR',checkout_reference:id,
     merchant_code:me.merchant_profile.merchant_code,
     description:'Babbo Natale a domicilio · CRI Monza',
     hosted_checkout:{enabled:true},redirect_url:returnUrl,
     return_url:origin+'/api/public/sumup-webhook',
    }));
   providerId=checkout.id;checkoutUrl=checkout.hosted_checkout_url;
  }else{
   const response=z.object({
    id:z.string(),links:z.array(z.object({rel:z.string(),href:z.string().url()})),
   }).parse(await paypal('/v2/checkout/orders','POST',{
    intent:'CAPTURE',purchase_units:[{
     custom_id:id,amount:{currency_code:'EUR',value:(amount/100).toFixed(2)},
     description:'Babbo Natale a domicilio · CRI Monza',
    }],
    payment_source:{paypal:{experience_context:{user_action:'PAY_NOW',
     return_url:returnUrl,cancel_url:returnUrl+'&annullato=1'}}},
   },id));
   providerId=response.id;
   const url=response.links.find(x=>x.rel==='payer-action'||x.rel==='approve')?.href;
   if(!url)throw new Error('Checkout PayPal non disponibile.');
   checkoutUrl=url;
  }
  const target=new URL(checkoutUrl);
  const hosts=data.provider==='paypal'?['paypal.com']:['sumup.com','sumup.me'];
  if(target.protocol!=='https:'||!hosts.some(h=>target.hostname===h||target.hostname.endsWith('.'+h)))
   throw new Error('Destinazione di pagamento non valida.');
  const saved=await db.from('santa_payment_attempts').update({
   provider_id:providerId,checkout_url:checkoutUrl,status:'pending',updated_at:new Date().toISOString(),
  }).eq('id',id).eq('status','creating');
  if(saved.error)throw new Error('Pagamento in verifica: non ripetere l’operazione.');
  await db.from('santa_bookings').update({payment_state:'in_verifica'}).eq('id',b.id)
   .in('payment_state',['da_pagare','in_verifica']);
  return {url:checkoutUrl};
 });

/** Re-read provider evidence, only then mark paid. Never trust callback
 * query params or a user clicking "Ho pagato".
 */
export async function reconcileSantaAttempt(id:string,capture:boolean){
 const a=await db.from('santa_payment_attempts').select('id,booking_id,provider,provider_id,amount_cents,status,capture_claimed_at')
  .eq('id',id).maybeSingle();
 if(a.error||!a.data||!a.data.provider_id)return 'pending' as const;
 const attempt=a.data;
 if(attempt.status==='paid')return 'paid' as const;
 if(attempt.status!=='pending')return 'pending' as const;
 let paymentId:string|undefined;
 const value=Number(attempt.amount_cents);
 if(attempt.provider==='sumup'){
  const r=z.object({id:z.string(),status:z.string(),checkout_reference:z.string(),
   amount:z.union([z.number(),z.string()]),currency:z.string(),
   transaction_id:z.string().optional(),
   transactions:z.array(z.object({id:z.string(),status:z.string()})).optional(),
  }).parse(await sumup('/v0.1/checkouts/'+encodeURIComponent(attempt.provider_id)));
  if(r.id!==attempt.provider_id||r.checkout_reference!==id||
   r.currency!=='EUR'||decimalCents(r.amount)!==value)throw new Error('Conferma SumUp non corrispondente.');
  if(r.status!=='PAID')return 'pending';
  paymentId=r.transactions?.find(x=>x.status==='SUCCESSFUL')?.id??r.transaction_id;
 }else{
  const schema=z.object({
   id:z.string(),status:z.string(),purchase_units:z.array(z.object({
    custom_id:z.string().optional(),
    amount:z.object({currency_code:z.string(),value:z.string()}).optional(),
    payments:z.object({captures:z.array(z.object({id:z.string(),status:z.string(),
     amount:z.object({currency_code:z.string(),value:z.string()})}))}).optional(),
   })),
  });
  let r=schema.parse(await paypal('/v2/checkout/orders/'+encodeURIComponent(attempt.provider_id)));
  const verify=(v:typeof r)=>{
   if(v.id!==attempt.provider_id||v.purchase_units.length!==1||
    v.purchase_units[0]?.custom_id!==id||
    v.purchase_units[0]?.amount?.currency_code!=='EUR'||
    decimalCents(v.purchase_units[0].amount.value)!==value)
     throw new Error('Conferma PayPal non corrispondente.');
  };
  verify(r);
  if(capture&&r.status==='APPROVED'&&!r.purchase_units[0]?.payments?.captures.length){
   const claim=await db.rpc('santa_claim_capture',{_attempt:id});
   if(claim.error||!claim.data)return 'pending';
   // A second capture is NEVER attempted after ambiguous provider response.
   await paypal('/v2/checkout/orders/'+encodeURIComponent(attempt.provider_id)+'/capture','POST',{},'santa-capture-'+id);
   r=schema.parse(await paypal('/v2/checkout/orders/'+encodeURIComponent(attempt.provider_id)));
   verify(r);
  }
  const captures=r.purchase_units[0]?.payments?.captures??[];
  if(r.status!=='COMPLETED'||captures.length!==1||captures[0]?.status!=='COMPLETED')
   return 'pending';
  if(captures[0].amount.currency_code!=='EUR'||decimalCents(captures[0].amount.value)!==value)
   throw new Error('Importo PayPal non corrispondente.');
  paymentId=captures[0].id;
 }
 if(!paymentId)return 'pending';
 const settled=await db.rpc('santa_settle_online_payment',{
  _attempt:id,_provider_id:attempt.provider_id,
  _payment_id:paymentId,_amount_cents:value,_currency:'EUR',
 });
 if(settled.error||!settled.data)throw new Error('Pagamento verificato dal provider, registrazione da riconciliare.');
 return 'paid' as const;
}
export const santaCheckCheckout=createServerFn({method:'POST'})
 .inputValidator(data=>z.object({token:tokenSchema,capture:z.boolean().default(false)}).strict().parse(data))
 .handler(async({data})=>{
  csrf();
  const {b,c}=await lookup(data.token);
  if(c.mode!=='live'||!c.online_checkout_enabled) return {state:b.payment_state as string};
  const latest=await db.from('santa_payment_attempts').select('id,provider,status')
   .eq('booking_id',b.id).order('created_at',{ascending:false}).limit(5);
  if(latest.error)throw new Error('Verifica non disponibile.');
  for(const attempt of latest.data??[]){
   if(attempt.status==='paid')return {state:'pagato_online'};
   if(attempt.status==='pending'){
    try{
     const result=await reconcileSantaAttempt(attempt.id,Boolean(data.capture));
     if(result==='paid')return {state:'pagato_online'};
    }catch{ return {state:'in_verifica'}; }
   }
  }
  return {state:b.payment_state as string};
 });
export async function syncSantaPendingPayments(){
 const current=await db.from('santa_admin_settings').select('mode,online_checkout_enabled')
  .eq('singleton',true).single();
 if(current.data?.mode!=='live'||!current.data?.online_checkout_enabled)return {checked:0,paid:0};
 const attempts=await db.from('santa_payment_attempts').select('id')
  .eq('status','pending').limit(100);
 if(attempts.error)throw new Error('Impossibile controllare i pagamenti.');
 let paid=0;for(const a of attempts.data??[]){
  try{if(await reconcileSantaAttempt(a.id,false)==='paid')paid++;}catch{}
 }
 return {checked:attempts.data?.length??0,paid};
}

/** Untrusted SumUp notification: do not mark paid from the body. Re-query
 * the provider with the stored ID and verify amount, currency and reference.
 */
export async function handleSantaSumupWebhook(request:Request){
 const config=await db.from('santa_admin_settings').select('mode,online_checkout_enabled')
  .eq('singleton',true).single();
 if(config.data?.mode!=='live'||!config.data.online_checkout_enabled)return;
 const raw=await request.text();
 if(raw.length>4096)throw new Error('Notification too large');
 const payload=z.object({event_type:z.string().max(100),id:z.string().min(1).max(100)})
  .parse(JSON.parse(raw));
 if(payload.event_type!=='CHECKOUT_STATUS_CHANGED')return;
 const attempt=await db.from('santa_payment_attempts').select('id')
  .eq('provider','sumup').eq('provider_id',payload.id).maybeSingle();
 if(attempt.error)throw new Error('Santa payment register unavailable');
 if(!attempt.data)return;
 await reconcileSantaAttempt(attempt.data.id,false);
}
