import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

/** QA-only identity; never grants a role or authorizes LIVE/volunteer operations. */
export function isQaOwner(user: Pick<User, 'id' | 'email' | 'email_confirmed_at'> | null, userId: string) {
  return !!user && user.id === userId && user.email === 'federico.rossi@crimonza.org' && !!user.email_confirmed_at;
}
export async function requireEmailQa(supabase: SupabaseClient<Database>, userId: string) {
  // getUser revalidates the bearer against Auth; no browser email/metadata/actor is trusted.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== userId) throw new Error('Accesso account non verificato.');
  if (isQaOwner(data.user, userId)) return;
  const role = await supabase.rpc('is_moderator');
  if (role.error || !role.data) throw new Error('Accedi con l’account verificato federico.rossi@crimonza.org. La password volontari non autorizza email.');
}