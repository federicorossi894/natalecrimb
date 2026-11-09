import { afterEach, expect, it } from 'vitest';
import { clearGiftSession, giftSessionSchema, loadGiftSession, mergeSessionOrnaments, onlineDedication, rememberSessionOrnament, saveGiftSession, sessionOrnaments } from '@/lib/online-gift-session';
const value={project:'calore',amount:5,request:'00000000-0000-4000-8000-000000000001',client:'00000000-0000-4000-8000-000000000002',id:'00000000-0000-4000-8000-000000000003',kind:'calore' as const,gift:true,to:'Nome privato',from:'Mittente privato',msg:'Cartolina privata',dedica:'Un abbraccio per Monza',firma:'Anna',consent:true,provider:'sumup' as const};
afterEach(()=>{sessionStorage.clear();clearGiftSession();});
it('consensual dedication is session-local and private postcard names never enter tree',()=>{
  rememberSessionOrnament(value);
  const rows=sessionOrnaments();
  expect(rows).toEqual([{id:value.id,kind:'calore',x:50,y:50,sessionOnly:true,dedica:'Un abbraccio per Monza',firma:'Anna'}]);
  expect(JSON.stringify(rows)).not.toContain('Nome privato');
  expect(localStorage.getItem('cri-online-session-tree')).toBeNull();
});
it('no consent retains bauble without dedication or signature',()=>{rememberSessionOrnament({...value,consent:false});expect(sessionOrnaments()[0]).not.toHaveProperty('dedica');expect(sessionOrnaments()[0]).not.toHaveProperty('firma');});
it('overlay keeps shared geometry and one bauble per id',()=>{rememberSessionOrnament(value);const rows=mergeSessionOrnaments([{id:value.id,kind:'calore',x:21,y:34}],sessionOrnaments());expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({x:21,y:34,dedica:value.dedica});});
it('current attempt recovers stable request but an explicit new gift clears it',()=>{saveGiftSession(value);expect(loadGiftSession('calore')?.request).toBe(value.request);expect(loadGiftSession('cuore')).toBeNull();clearGiftSession();expect(loadGiftSession('calore')).toBeNull();saveGiftSession({...value,request:'00000000-0000-4000-8000-000000000004',id:null});expect(loadGiftSession('calore')?.request).not.toBe(value.request);});
it('dedication caps 90 and signature 40, rejects markup/control payloads',()=>{expect(onlineDedication.safeParse({dedica:'x'.repeat(90),firma:'x'.repeat(40),consent:true}).success).toBe(true);for(const input of [{dedica:'x'.repeat(91),firma:''},{dedica:'',firma:'x'.repeat(41)},{dedica:'<img onerror=evil()>',firma:''}])expect(onlineDedication.safeParse({...input,consent:true}).success).toBe(false);expect(giftSessionSchema.safeParse({...value,to:'x'.repeat(41)}).success).toBe(false);});