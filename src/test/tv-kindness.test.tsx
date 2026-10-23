import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let fakeNow = new Date("2026-12-05T08:59:50Z");
const doors = Array.from({ length: 24 }, (_, i) => ({ day: i + 1, title: i < 5 ? `Titolo ${i + 1}` : null, message: i < 5 ? `Messaggio del giorno ${i + 1}` : null }));
vi.mock("@/lib/kindness", async (orig) => {
  const real = await orig<typeof import("@/lib/kindness")>();
  return { ...real, useKindnessCalendar: () => ({ doors, status: "ready", now: () => fakeNow, reload: async () => {} }) };
});

import { TvKindness } from "@/components/xmas/TvKindness";

describe("TV kindness corner", () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("opens today's door at 10:00 Rome once, then keeps the compact message", () => {
    fakeNow = new Date("2026-12-05T08:59:50Z");
    render(<TvKindness reduced={false} />);
    expect(screen.getByTestId("tv-kindness").textContent).toContain("Messaggio del giorno 4");
    fakeNow = new Date("2026-12-05T09:00:01Z");
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByTestId("tv-advent").textContent).toContain("Messaggio del giorno 5");
    act(() => { vi.advanceTimersByTime(17000); });
    expect(screen.queryByTestId("tv-advent")).toBeNull();
    expect(screen.getByTestId("tv-kindness").textContent).toContain("Messaggio del giorno 5");
  });

  it("shows the current message straight away after a reload past 10:00, without the ceremony", () => {
    fakeNow = new Date("2026-12-05T13:00:00Z");
    render(<TvKindness reduced={false} />);
    act(() => { vi.advanceTimersByTime(20000); });
    expect(screen.queryByTestId("tv-advent")).toBeNull();
    expect(screen.getByTestId("tv-kindness").textContent).toContain("Messaggio del giorno 5");
  });

  it("shows a preview before 1 December", () => {
    fakeNow = new Date("2026-10-27T10:00:00Z");
    render(<TvKindness reduced={false} />);
    expect(screen.getByTestId("tv-kindness").dataset["phase"]).toBe("preview");
  });
});
