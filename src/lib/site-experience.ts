/** Build-time UX axis. Never read URL, storage or visitor input to enable features. */
export type SiteExperience = 'ONLINE_GIFT' | 'FULL';
export const SITE_EXPERIENCE: SiteExperience = 'ONLINE_GIFT';
export const ONLINE_GIFT = SITE_EXPERIENCE === 'ONLINE_GIFT';
export const ONLINE_OPTIONS = { santa: false, children: false, calendar: false } as const;
export function experienceRouteAllowed(path: string, experience: SiteExperience = SITE_EXPERIENCE) {
  if (experience === 'FULL') return true;
  const p = path.replace(/\/$/, '') || '/';
  if (!ONLINE_OPTIONS.calendar && p === '/calendario') return false;
  const disabled = ['/piazza', '/casetta', '/albero-live', '/tv-preview', '/volontari', '/auguri', '/augurio', '/moderazione', '/presentazione', '/crediti-musica'];
  if (disabled.some(base => p === base || p.startsWith(base + '/'))) return false;
  if (!ONLINE_OPTIONS.santa && (p === '/babbo-natale' || p.startsWith('/babbo-natale/'))) return false;
  if (!ONLINE_OPTIONS.children && ['/giochi', '/piccoli-volontari'].some(base => p === base || p.startsWith(base + '/'))) return false;
  return true;
}
export function assertFullExperience(experience: SiteExperience = SITE_EXPERIENCE) {
  if (experience !== 'FULL') throw new Error('Operazione non disponibile in questa esperienza.');
}
export function projectOnly<T extends { firma?: unknown; dedica?: unknown }>(row: T): T {
  return { ...row, firma: undefined, dedica: undefined };
}