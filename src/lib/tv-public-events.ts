import type { TreeOrnament } from './data';
import type { PublicWish } from './wishes';
export type PublicEvent = { type:'wish'|'dedication'; id:string };
export function publicEventChanges(previous:{wishes:Set<string>;dedications:Set<string>;ornaments:Set<string>}|null, ornaments:readonly TreeOrnament[], wishes:readonly PublicWish[]) {
  const snapshot={wishes:new Set(wishes.map(w=>w.id)),dedications:new Set(ornaments.filter(o=>o.dedica).map(o=>String(o.id))),ornaments:new Set(ornaments.map(o=>String(o.id)))};
  const events:PublicEvent[]=previous?[
    ...wishes.filter(w=>!previous.wishes.has(w.id)).map(w=>({type:'wish' as const,id:w.id})),
    ...ornaments.filter(o=>o.dedica&&previous.ornaments.has(String(o.id))&&!previous.dedications.has(String(o.id))).map(o=>({type:'dedication' as const,id:String(o.id)})),
  ]:[];
  return {snapshot,events};
}
export function queuePublicEvents(queue:PublicEvent[],fresh:PublicEvent[]) {
  const ids=new Set(queue.map(e=>`${e.type}:${e.id}`));
  return [...queue,...fresh.filter(e=>{const id=`${e.type}:${e.id}`;if(ids.has(id))return false;ids.add(id);return true;})].slice(0,6);
}