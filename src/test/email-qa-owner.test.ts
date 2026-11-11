// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { isQaOwner, requireEmailQa } from '@/lib/email-qa-auth.server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
const owner={id:'owner',email:'natale@crimonza.org',email_confirmed_at:'2026-11-09'};
const legacy={id:'legacy',email:'federico.rossi@crimonza.org',email_confirmed_at:'2026-11-09'};
function client(user:typeof owner|null,moderator=false){return {auth:{getUser:vi.fn(async()=>({data:{user},error:null}))},rpc:vi.fn(async()=>({data:moderator,error:null}))};}
it('only exact confirmed owner identity matching validated bearer is QA_OWNER',()=>{
  expect(isQaOwner(owner,'owner')).toBe(true);
  expect(isQaOwner({...owner,email:'federico.rossi894@gmail.com'},'owner')).toBe(false);
  expect(isQaOwner({...owner,email_confirmed_at:''},'owner')).toBe(false);
  expect(isQaOwner(owner,'forged')).toBe(false);
  expect(isQaOwner(null,'shared-volunteer')).toBe(false);
  expect(isQaOwner(legacy,'legacy')).toBe(true);
});
it('the existing verified CRI account still reaches QA without a role grant',async()=>{
  const c=client(legacy);await requireEmailQa(c as unknown as SupabaseClient<Database>,'legacy');
  expect(c.auth.getUser).toHaveBeenCalledOnce();expect(c.rpc).not.toHaveBeenCalled();
});
it('owner is revalidated server-side without role grant/check',async()=>{
  const c=client(owner);await requireEmailQa(c as unknown as SupabaseClient<Database>,'owner');
  expect(c.auth.getUser).toHaveBeenCalledOnce();expect(c.rpc).not.toHaveBeenCalled();
});
it('foreign signed-in account and shared password session cannot send',async()=>{
  const c=client({...owner,email:'other@example.org'});
  await expect(requireEmailQa(c as unknown as SupabaseClient<Database>,'owner')).rejects.toThrow('Accedi');
  await expect(requireEmailQa(client(null) as unknown as SupabaseClient<Database>,'shared-session')).rejects.toThrow('non verificato');
});
it('existing moderator still allowed but revalidated identity must match actor',async()=>{
  const c=client({...owner,email:'moderator@example.org'},true);
  await requireEmailQa(c as unknown as SupabaseClient<Database>,'owner');
  await expect(requireEmailQa(c as unknown as SupabaseClient<Database>,'other-id')).rejects.toThrow('non verificato');
});