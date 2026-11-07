import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { assertCampaignRpc } from './campaign';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const input = z.object({ name: z.string().max(64), args: z.record(z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()])).default({}) });
// The DB dispatcher retains each original validation, consent rule and row lock.
export const publicDemoRpc = createServerFn({ method: 'POST' })
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data }) => {
    assertCampaignRpc(data.name, 'public');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: result, error } = await supabaseAdmin.rpc('campaign_demo_dispatch', { _name: data.name, _args: data.args, _actor: null });
    if (error) throw new Error('Operazione non completata. Controlla i dati e riprova.');
    return result;
  });
export const staffDemoRpc = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data, context }) => {
    const mod = data.name === 'moderate_wish';
    assertCampaignRpc(data.name, mod ? 'moderator' : 'volunteer');
    const { data: allowed, error: roleError } = await context.supabase.rpc(mod ? 'is_moderator' : 'is_volunteer');
    if (roleError || !allowed) throw new Error('Operazione non autorizzata.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: result, error } = await supabaseAdmin.rpc('campaign_demo_dispatch', { _name: data.name, _args: data.args, _actor: context.userId });
    if (error) throw new Error('Operazione non completata. Controlla i dati e riprova.');
    return result;
  });