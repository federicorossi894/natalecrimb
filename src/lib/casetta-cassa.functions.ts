import { createServerFn } from '@tanstack/react-start';
import { getRequest, getRequestHeader } from '@tanstack/react-start/server';
import { z } from 'zod';

const productSchema=z.object({id:z.string(),label:z.string(),priceCents:z.number().int().positive()});
const catalogSchema=z.object({mode:z.enum(['test','live']),open:z.boolean(),products:z.array(productSchema)});
const saleInput=z.object({
  requestId:z.string().uuid(),
  deviceId:z.string().uuid(),
  method:z.enum(['cash','pos']),
  items:z.array(z.object({id:z.string().regex(/^[a-z0-9_-]{2,40}$/),quantity:z.number().int().min(1).max(99)}).strict()).min(1).max(20),
  firstName:z.string().trim().min(2).max(80).regex(/^[\p{L} '-]+$/u),
  lastName:z.string().trim().min(2).max(80).regex(/^[\p{L} '-]+$/u),
  email:z.union([z.string().email().max(254),z.literal('')]).optional(),
}).strict();
export type CasettaProduct=z.infer<typeof productSchema>;
export type CasettaCatalog=z.infer<typeof catalogSchema>;
export type CasettaSaleInput=z.infer<typeof saleInput>;

async function rpc(name:string,params:Record<string,unknown>={}) {
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  return (supabaseAdmin as unknown as {
    rpc:(fn:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown,error:{message:string}|null}>
  }).rpc(name,params);
}
function sameOrigin(){
  const origin=getRequestHeader('origin');
  const request=getRequest();
  if(!origin || new URL(origin).origin!==new URL(request.url).origin)
    throw new Error('Richiesta non autorizzata.');
}
async function tagFor(deviceId:string){
  const ip=(getRequestHeader('cf-connecting-ip')||getRequestHeader('x-forwarded-for')||'unknown').split(',')[0]!.trim();
  const day=new Date().toISOString().slice(0,10);
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode([ip,deviceId,day].join('|')));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export const casettaState=createServerFn({method:'GET'}).handler(async()=>{
  const {data,error}=await rpc('casetta_catalog');
  if(error)throw new Error('Cassa temporaneamente non disponibile.');
  return catalogSchema.parse(data);
});
export const casettaRecordSale=createServerFn({method:'POST'})
 .inputValidator(input=>saleInput.parse(input))
 .handler(async({data})=>{
   sameOrigin();
   const {data:result,error}=await rpc('casetta_record_sale',{
     _request_id:data.requestId,_method:data.method,_items:data.items,
     _email:data.email||null,_client_tag:await tagFor(data.deviceId),
     _first_name:data.firstName,_last_name:data.lastName,
   });
   if(error){
     if(/chiusa|20 alle 08/i.test(error.message))throw new Error('Cassa chiusa: riapre alle 08:00.');
     if(/Troppe|occupata/i.test(error.message))throw new Error('Troppe operazioni. Attendi un minuto.');
     throw new Error('Registrazione non confermata. Riprova con lo stesso riepilogo.');
   }
   return z.object({
     id:z.string().uuid(),totalCents:z.number().int(),mode:z.enum(['test','live']),
     alreadyRecorded:z.boolean(),
   }).parse(result);
 });
