import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResilientPoll } from '@/lib/resilient-poll';
import { queueArrivals, reloadAllowed, SAFETY_RELOAD_MS, startTvReliability, TV_GPU_RECOVERY } from '@/lib/tv-reliability';
import { crossedNoon, romeParts, tvDay } from '@/lib/kindness';
import { useTreeStore } from '@/lib/tree-store';

const mocks = vi.hoisted(() => ({ demo: vi.fn(), live: vi.fn(), tv: vi.fn() }));
vi.mock('@/lib/tv-tree.functions', () => ({ publicTvTree: mocks.tv }));
vi.mock('@/lib/campaign-rpc', () => ({ campaignRpc: mocks.demo }));
vi.mock('@/lib/payments.functions', () => ({ livePublicTree: mocks.live }));
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-08T00:00:00Z'));
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('TV read reliability', () => {
  it('uses exactly one public read per 15 seconds and never touches blocked localStorage', async () => {
    const storage = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('blocked'); });
    mocks.tv.mockResolvedValue({ rows: [{ id: 'one', kind: 'calore', x: 50, y: 50 }], count: 301 });
    const tv = renderHook(() => useTreeStore({ publicOnly: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(mocks.tv).toHaveBeenCalledTimes(3); expect(mocks.demo).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled(); expect(tv.result.current.addedCount).toBe(301);
    tv.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it('aborts delayed reads, ignores their late result and recovers immediately online', async () => {
    let late: ((n: number) => void) | undefined;
    const read = vi.fn().mockResolvedValueOnce(33).mockImplementationOnce(() => new Promise<number>(resolve => { late = resolve; })).mockResolvedValue(36);
    const hook = renderHook(() => useResilientPoll<number>(read, 0, 15_000));
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(read).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(12_000); });
    expect(read.mock.calls[1]?.[0].aborted).toBe(true);
    expect(hook.result.current.data).toBe(33); expect(hook.result.current.error).toBe(true);
    await act(async () => { window.dispatchEvent(new Event('online')); await Promise.resolve(); });
    expect(hook.result.current.data).toBe(36);
    await act(async () => { late?.(1); await Promise.resolve(); });
    expect(hook.result.current.data).toBe(36);
    hook.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it('catches synchronous exceptions, preserves data offline and avoids overlapping refresh', async () => {
    const read = vi.fn().mockResolvedValueOnce(33).mockImplementation(() => { throw Error('sync'); });
    const hook = renderHook(() => useResilientPoll<number>(read, 0, 15_000));
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(hook.result.current.data).toBe(33); expect(hook.result.current.error).toBe(true);
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await act(async () => { window.dispatchEvent(new Event('offline')); await vi.advanceTimersByTimeAsync(60_000); });
    expect(read).toHaveBeenCalledTimes(2); expect(hook.result.current.stale).toBe(true);
    hook.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it('does not start overlapping reads when polling or manual refresh hits an in-flight read', async () => {
    const read = vi.fn(() => new Promise<number>(() => {}));
    const hook = renderHook(() => useResilientPoll(read, 0, 1000, 12_000));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); void hook.result.current.refresh(); });
    expect(read).toHaveBeenCalledTimes(1);
    hook.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
});

describe('TV restart and queue policy', () => {
  it('holds 6h reload through 11:58–12:03 Rome and bounds a continuous busy deferral', () => {
    const due = new Date('2026-12-05T10:58:00Z').getTime();
    for (const iso of ['2026-12-05T10:58:00Z','2026-12-05T10:59:59Z','2026-12-05T11:00:23Z','2026-12-05T11:02:59Z']) expect(reloadAllowed(new Date(iso), due, true, false)).toBe(false);
    expect(reloadAllowed(new Date('2026-12-05T11:03:00Z'), due, true, true)).toBe(true);
    expect(reloadAllowed(new Date('2026-12-05T11:03:00Z'), due, false, false)).toBe(false);
    expect(reloadAllowed(new Date(due + 119_999), due, true, true)).toBe(false);
  });
  it('queues a batch once, bounded to six; every ornament still remains in the public count', () => {
    const batch = Array.from({length: 20}, (_,i) => ({id: `${i}`,kind: 'calore' as const,x: 50,y: 50}));
    expect(queueArrivals([], batch).map(o => o.id)).toEqual(['0','1','2','3','4','5']);
    expect(queueArrivals(batch.slice(0,2), batch).map(o => o.id)).toEqual(['0','1','2','3','4','5']);
    expect(batch).toHaveLength(20);
  });
  it('releases late Wake Lock grants after cleanup and retries a denied lock on reconnect', async () => {
    let resolve: ((v: { release: () => Promise<void> }) => void) | undefined;
    const release = vi.fn(async () => {});
    const request = vi.fn().mockRejectedValueOnce(Error('denied')).mockImplementationOnce(() => new Promise(r => {resolve = r;}));
    Object.defineProperty(navigator, 'wakeLock', { value: {request}, configurable: true });
    const stop = startTvReliability(() => false, vi.fn());
    await Promise.resolve(); await Promise.resolve();
    window.dispatchEvent(new Event('online')); await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(2);
    stop(); resolve?.({release}); await Promise.resolve(); await Promise.resolve();
    expect(release).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
  it('defers a due safety restart at noon, and GPU recovery while offline', async () => {
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
    vi.setSystemTime(new Date('2026-12-05T04:59:00Z'));
    const reload = vi.fn(); const stop = startTvReliability(() => false, reload);
    await vi.advanceTimersByTimeAsync(SAFETY_RELOAD_MS);
    expect(reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(4 * 60_000);
    expect(reload).toHaveBeenCalledTimes(1);
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event(TV_GPU_RECOVERY));
    await vi.advanceTimersByTimeAsync(9000); expect(reload).toHaveBeenCalledTimes(1);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    await vi.advanceTimersByTimeAsync(1000); expect(reload).toHaveBeenCalledTimes(2);
    stop(); expect(vi.getTimerCount()).toBe(0);
  });
});

it('observes all 24 noon boundaries through 40 virtual days Nov–Jan, no late replay, including Rome DST rules', () => {
  const start = new Date('2026-11-28T10:59:55Z').getTime();
  let ceremonies = 0;
  for (let day = 0; day < 40; day++) {
    const before = new Date(start + day * 86400_000);
    const after = new Date(before.getTime() + 5000);
    if (crossedNoon(before, after)) ceremonies++;
    expect(crossedNoon(null, after)).toBe(false);
    expect(crossedNoon(before, new Date(after.getTime() + 60_000))).toBe(false);
    expect(tvDay(after)).toBeLessThanOrEqual(24);
  }
  expect(ceremonies).toBe(24);
  expect(romeParts(new Date('2026-10-25T00:30:00Z')).hour).toBe(2);
  expect(romeParts(new Date('2026-10-25T01:30:00Z')).hour).toBe(2);
  expect(romeParts(new Date('2026-07-01T10:00:00Z')).hour).toBe(12);
});