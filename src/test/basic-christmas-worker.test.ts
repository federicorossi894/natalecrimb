// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
const db=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client.server',()=>({supabaseAdmin:db}));
import { processDueChristmasGiftEmails } from '@/lib/donation-email.server';
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
it('BASIC does not query or send Christmas gifts one second before the deadline',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-12-24T23:04:59Z'));
  expect(await processDueChristmasGiftEmails()).toEqual({state:'out_of_window',processed:0});
  expect(db.from).not.toHaveBeenCalled();expect(db.rpc).not.toHaveBeenCalled();
});
it('BASIC opens only the bounded due queue at 25 December 00:05 Rome',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-12-24T23:05:00Z'));
  const q={select:vi.fn(),eq:vi.fn(),not:vi.fn(),lte:vi.fn(),order:vi.fn(),limit:vi.fn().mockResolvedValue({data:[],error:null})};
  for(const key of ['select','eq','not','lte','order'] as const)q[key].mockReturnValue(q);
  db.from.mockReturnValue(q);
  expect(await processDueChristmasGiftEmails()).toEqual({state:'checked',processed:0,accepted:0,review:0});
  expect(q.eq).toHaveBeenCalledWith('status','paid');
  expect(q.eq).toHaveBeenCalledWith('settlement_state','completed');
  expect(q.lte).toHaveBeenCalledWith('gift_email_due_at','2026-12-24T23:05:00.000Z');
  expect(q.limit).toHaveBeenCalledWith(12);expect(db.rpc).not.toHaveBeenCalled();
});