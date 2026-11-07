import { publicDemoRpc, staffDemoRpc } from './campaign.functions';
import { VOLUNTEER_DEMO_RPC, MODERATOR_DEMO_RPC, type DemoRpc } from './campaign';
import type { Database } from '@/integrations/supabase/types';
type F = Database['public']['Functions'];
/** Same response shape as the former browser RPC; authorization now lives on the server. */
export async function campaignRpc<N extends DemoRpc>(name: N, args?: F[N]['Args']): Promise<{ data: F[N]['Returns'] | null; error: { message: string } | null }> {
  try {
    const staff: readonly string[] = [...VOLUNTEER_DEMO_RPC, ...MODERATOR_DEMO_RPC];
    const fn = staff.includes(name) ? staffDemoRpc : publicDemoRpc;
    const data = await fn({ data: { name, args: args ?? {} } });
    return { data: data as F[N]['Returns'], error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'Operazione indisponibile' } };
  }
}