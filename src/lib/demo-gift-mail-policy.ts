import { z } from 'zod';
export const demoGiftMailInput = z.object({
  ornamentId:z.string().uuid(), giftRequestId:z.string().uuid(), client:z.string().uuid(),
  kind:z.enum(['receipt','gift_now','christmas_simulation']),
  recipient:z.literal('natale@crimonza.org'), approved:z.literal(true),
  donor:z.string().trim().max(40), toName:z.string().trim().max(40), msg:z.string().trim().max(90),
}).strict();
export type DemoGiftMailPayload = {projectTitle:string;amount:number;ornamentId:string;donor:string;toName:string;msg:string};
/** One immutable claim per ornament/purpose, including after reload/back/timeout. */
export async function giftMailClaimId(ornamentId:string,kind:string){
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`online-gift-mail:${ornamentId}:${kind}`)));
  bytes[6]=((bytes[6] ?? 0)&15)|80;bytes[8]=((bytes[8] ?? 0)&63)|128;
  const h=Array.from(bytes.slice(0,16),v=>v.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}