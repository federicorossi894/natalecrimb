/** Redirect legacy public page visits to the official site before browser-local progress is created.
 * Restrict to document navigations: do not redirect API, JSON, OAuth or server-function calls.
 */
export const CANONICAL_NATALE_ORIGIN = 'https://natale.crimonza.org';

export function canonicalNataleNavigation(request: Request): URL | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const accept = request.headers.get('accept') ?? '';
  if (!accept.includes('text/html')) return null;
  const current = new URL(request.url);
  if (current.hostname !== 'natalecrimb.lovable.app') return null;
  return new URL(current.pathname + current.search, CANONICAL_NATALE_ORIGIN);
}
