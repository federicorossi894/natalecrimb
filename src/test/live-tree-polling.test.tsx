import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CAMPAIGN, campaignCapabilities } from "@/lib/campaign";
import { useTreeStore, POLL_MS } from "@/lib/tree-store";

const mocks = vi.hoisted(() => ({ live: vi.fn(), demo: vi.fn() }));
vi.mock("@/lib/payments.functions", () => ({ livePublicTree: mocks.live }));
vi.mock("@/lib/campaign-rpc", () => ({ campaignRpc: mocks.demo }));
const original = { ...CAMPAIGN };
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.live.mockResolvedValue([]);
});
afterEach(() => {
  vi.useRealTimers();
  Object.assign(CAMPAIGN, original);
});
it.each(["BASIC", "ADVANCED_1", "ADVANCED_2"] as const)(
  "%s phone and TV read the same confirmed ornament within 15 seconds, no DEMO data",
  async (mode) => {
    Object.assign(CAMPAIGN, campaignCapabilities(mode));
    const phone = renderHook(useTreeStore);
    const tv = renderHook(useTreeStore);
    await act(async () => {
      await Promise.resolve();
    });
    expect(phone.result.current.total).toBe(0);
    expect(tv.result.current.total).toBe(0);
    mocks.live.mockImplementation(async () => [
      {
        id: "confirmed-once",
        kind: "calore",
        x: 50,
        y: 60,
        firma: null,
        dedica: null,
        created_at: "2026-11-08T00:00:00Z",
      },
    ]);
    expect(POLL_MS).toBe(15000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(phone.result.current.publicOrnaments.map((o) => o.id)).toEqual(["confirmed-once"]);
    expect(tv.result.current.publicOrnaments.map((o) => o.id)).toEqual(["confirmed-once"]);
    expect(phone.result.current.total).toBe(1);
    expect(tv.result.current.total).toBe(1);
    expect(mocks.demo).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(phone.result.current.total).toBe(1);
    expect(tv.result.current.total).toBe(1);
    phone.unmount();
    tv.unmount();
  },
);
