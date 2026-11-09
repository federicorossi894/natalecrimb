import { ONLINE_GIFT, assertFullExperience } from './site-experience';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { assertCampaignRpc, assertDemoData } from './campaign';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const input = z.object({ name: z.string().max(64), args: z.record(z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()])).default({}) });
// The DB dispatcher retains each original validation, consent rule and row lock.
export const publicDemoRpc = createServerFn({ method: 'POST' })
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data }) => {
    assertCampaignRpc(data.name, 'public');
    if (ONLINE_GIFT && !['public_tree','my_ornaments'].includes(data.name)) throw new Error('Operazione non disponibile.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: result, error } = await supabaseAdmin.rpc('campaign_demo_dispatch', { _name: data.name, _args: data.args });
    if (error) throw new Error('Operazione non completata. Controlla i dati e riprova.');
    return ONLINE_GIFT && Array.isArray(result) ? result.map(row => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
      return {...row, firma: null, dedica: null};
    }) : result;
  });
export const staffDemoRpc = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data, context }) => {
    assertFullExperience();
    const mod = data.name === 'moderate_wish';
    assertCampaignRpc(data.name, mod ? 'moderator' : 'volunteer');
    const { data: allowed, error: roleError } = await context.supabase.rpc(mod ? 'is_moderator' : 'is_volunteer');
    if (roleError || !allowed) throw new Error('Operazione non autorizzata.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: result, error } = await supabaseAdmin.rpc('campaign_demo_dispatch', { _name: data.name, _args: data.args, _actor: context.userId });
    if (error) throw new Error('Operazione non completata. Controlla i dati e riprova.');
    return result;
  });

export const demoModeration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ action: z.enum(['ornaments', 'wishes', 'setOrnament']), id: z.string().uuid().optional(), status: z.enum(['approved', 'rejected']).optional() }).parse(data))
  .handler(async ({ data, context }) => {
    assertFullExperience();
    assertDemoData();
    const { data: allowed, error } = await context.supabase.rpc('is_moderator');
    if (error || !allowed) throw new Error('Operazione non autorizzata.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    if (data.action === 'setOrnament') {
      if (!data.id || !data.status) throw new Error('Dati mancanti');
      const res = await supabaseAdmin.from('demo_ornaments').update({ status: data.status }).eq('id', data.id);
      if (res.error) throw new Error('Moderazione non completata');
      return { ornaments: [], wishes: [] };
    }
    if (data.action === 'ornaments') {
      const res = await supabaseAdmin.from('demo_ornaments').select('id,kind,firma,dedica,status,publish_consent,created_at').not('dedica', 'is', null).order('created_at', { ascending: false }).limit(100);
      if (res.error) throw new Error('Lettura non disponibile');
      return { ornaments: res.data ?? [], wishes: [] };
    }
    const res = await supabaseAdmin.from('wishes').select('id,body,nickname,status,auto_flags,created_at').order('created_at', { ascending: false }).limit(200);
    if (res.error) throw new Error('Lettura non disponibile');
    return { ornaments: [], wishes: res.data ?? [] };
  });