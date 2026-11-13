import { CAMPAIGN } from '@/lib/campaign';

/** UX/SSR gate only; existing server authorization remains the security boundary. */
export function qaRouteAllowed(path: string, demo = CAMPAIGN.demo): boolean {
  const normalized = path.replace(/\/+$/, '') || '/';
  const reserved = ['/collaudo-pagamenti', '/email-qa'];
  return demo || !reserved.some(base => normalized === base || normalized.startsWith(`${base}/`));
}