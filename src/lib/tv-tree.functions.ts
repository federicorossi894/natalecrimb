import { ONLINE_GIFT } from './site-experience';
import { createServerFn } from '@tanstack/react-start';
import { assertDemoData } from './campaign';
import { TV_ORNAMENT_LIMIT, TV_TREE_COLUMNS, tvTreeSummary } from './tv-tree-summary';

/** Dedicated DEMO read: one count+bounded-public-row query, no device identifier or write path. */
export const publicTvTree = createServerFn({ method: 'POST' }).handler(async () => {
  assertDemoData();
  // Underlying DEMO table deliberately has no anon reads. This replaces the existing service-only
  // public_tree dispatcher for the kiosk only; fixed projection/filters redact all private fields.
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, count, error } = await supabaseAdmin.from('demo_ornaments')
    .select(TV_TREE_COLUMNS, { count: 'exact' }).neq('status','rejected')
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(TV_ORNAMENT_LIMIT);
  if (error || count === null) throw new Error('Albero non disponibile.');
  const summary=tvTreeSummary(data ?? [], count);
  return summary;
});