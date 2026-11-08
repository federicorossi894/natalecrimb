import { romeParts } from './kindness';

export const SAFETY_RELOAD_MS = 6 * 60 * 60 * 1000;
export const MAX_BUSY_DEFER_MS = 2 * 60_000;
export const ARRIVAL_MS = 10_000;
export const MAX_ARRIVALS = 6;
export const TV_GPU_RECOVERY = 'cri-tv-gpu-recovery';

/** Calendar window has a fixed end; a continuous arrival stream may defer only two minutes. */
export function reloadAllowed(now: Date, dueSince: number, online: boolean, busy: boolean) {
  if (!online) return false;
  const r = romeParts(now);
  const minute = r.hour * 60 + r.minute;
  if (minute >= 11 * 60 + 58 && minute < 12 * 60 + 3) return false;
  return !busy || now.getTime() - dueSince >= MAX_BUSY_DEFER_MS;
}

export function queueArrivals(queue: import('./data').TreeOrnament[], fresh: import('./data').TreeOrnament[]) {
  const ids = new Set(queue.map(o => o.id));
  return [...queue, ...fresh.filter(o => !ids.has(o.id))].slice(0, MAX_ARRIVALS);
}

type WakeLock = { release: () => Promise<void>; released?: boolean; addEventListener?: (name: string, fn: () => void) => void; removeEventListener?: (name: string, fn: () => void) => void };
type WakeNavigator = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLock> } };

/** Browser-only best effort. Pending grants are released even when they arrive after unmount. */
export function startTvReliability(isBusy: () => boolean, reload = () => window.location.reload()) {
  let alive = true;
  let pending = false;
  let lock: WakeLock | null = null;
  let nextWakeAttempt = 0;
  let dueAt = Date.now() + SAFETY_RELOAD_MS;
  const released = () => { lock = null; };
  const request = async () => {
    if (!alive || pending || lock || Date.now() < nextWakeAttempt || document.visibilityState !== 'visible') return;
    nextWakeAttempt = Date.now() + 60_000;
    pending = true;
    try {
      const grant = await (navigator as WakeNavigator).wakeLock?.request('screen');
      if (!grant) return;
      if (!alive) { await grant.release(); return; }
      lock = grant;
      grant.addEventListener?.('release', released);
    } catch { /* OS/browser refusal is not a screen error. */ }
    finally { pending = false; }
  };
  const visible = () => { if (document.visibilityState === 'visible') { nextWakeAttempt = 0; void request(); } };
  const recovery = () => { dueAt = Math.min(dueAt, Date.now() + 8000); };
  const tick = () => {
    // Retry a revoked lock without building parallel requests.
    void request();
    if (Date.now() >= dueAt && reloadAllowed(new Date(), dueAt, navigator.onLine, isBusy())) {
      dueAt = Date.now() + SAFETY_RELOAD_MS;
      reload();
    }
  };
  void request();
  const timer = setInterval(tick, 1000);
  window.addEventListener('online', visible);
  window.addEventListener(TV_GPU_RECOVERY, recovery);
  document.addEventListener('visibilitychange', visible);
  return () => {
    alive = false; clearInterval(timer);
    window.removeEventListener('online', visible); window.removeEventListener(TV_GPU_RECOVERY, recovery);
    document.removeEventListener('visibilitychange', visible);
    lock?.removeEventListener?.('release', released);
    void lock?.release().catch(() => {});
  };
}