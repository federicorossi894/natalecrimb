import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

let client: ReturnType<typeof createClient<Database>> | undefined;
/** Public data reads have no auth session, storage or refresh-token dependency. */
export function publicReadClient() {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      } },
    });
  }
  return client;
}