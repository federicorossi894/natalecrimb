import { useCallback, useEffect, useRef, useState } from 'react';

/** One bounded, cancellable read at a time; failed reads never erase the last good value. */
export function useResilientPoll<T>(read: (signal: AbortSignal) => Promise<T>, initial: T, intervalMs: number, timeoutMs = 12_000) {
  const reader = useRef(read);
  reader.current = read;
  const [data, setData] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [stale, setStale] = useState(false);
  const [lastSuccess, setLastSuccess] = useState<number | null>(null);
  const [checkedAt, setCheckedAt] = useState(0);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(() => refreshRef.current(), []);
  useEffect(() => {
    let alive = true;
    let running = false;
    let generation = 0;
    let controller: AbortController | null = null;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let success: number | null = null;
    const load = async () => {
      if (!alive || running) return;
      if (!navigator.onLine) { setError(true); return; }
      running = true;
      const ticket = ++generation;
      const abort = new AbortController();
      controller = abort;
      try {
        const value = await Promise.race([
          Promise.resolve().then(() => reader.current(abort.signal)),
          new Promise<never>((_, reject) => {
            deadline = setTimeout(() => { abort.abort(); reject(new Error('Read timeout')); }, timeoutMs);
          }),
        ]);
        if (!alive || ticket !== generation) return;
        success = Date.now();
        setData(value); setLoaded(true); setError(false); setStale(false); setLastSuccess(success);
      } catch {
        if (alive && ticket === generation) setError(true);
      } finally {
        if (ticket === generation) { clearTimeout(deadline); controller = null; running = false; }
      }
    };
    refreshRef.current = load;
    const online = () => {
      // Invalidate the disconnected read before starting a fresh one. Late responses cannot win.
      ++generation; controller?.abort(); clearTimeout(deadline); running = false;
      void load();
    };
    const offline = () => { if (alive) setError(true); };
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    void load();
    const poll = setInterval(() => void load(), intervalMs);
    const health = setInterval(() => {
      if (alive) { setCheckedAt(Date.now()); setStale(success === null || Date.now() - success > intervalMs * 2 + timeoutMs); }
    }, Math.min(intervalMs, 15_000));
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', visible);
    return () => {
      alive = false; ++generation; controller?.abort(); clearTimeout(deadline);
      clearInterval(poll); clearInterval(health);
      window.removeEventListener('online', online); window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', visible);
      refreshRef.current = async () => {};
    };
  }, [intervalMs, timeoutMs]);
  return { data, loaded, error, stale, lastSuccess, checkedAt, refresh };
}