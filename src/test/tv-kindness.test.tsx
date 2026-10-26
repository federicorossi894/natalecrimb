import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let fakeNow = new Date("2026-12-05T10:59:50Z");
const doors = Array.from({ length: 24 }, (_, i) => ({ day: i + 1, title: i < 5 ? `Titolo ${i + 1}` : null, message: i < 5 ? `Messaggio del giorno ${i + 1}` : null }));
vi.mock("@/lib/kindness", async (orig) => {
  const real = await orig<typeof import("@/lib/kindness")>();
  return { ...real, useKindnessCalendar: () => ({ doors, status: "ready", now: () => fakeNow, reload: async () => {} }) };
});

import { TvKindness, CEREMONY_MS } from "@/components/xmas/TvKindness";

describe("TV kindness corner · 12:00", () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("opens today's door at 12:00 Rome once on the sede, then returns to the compact message", () => {
    fakeNow = new Date("2026-12-05T10:59:50Z"); // 11:59:50 Rome
    render(<TvKindness reduced={false} />);
    expect(screen.getByTestId("tv-kindness").textContent).toContain("Messaggio del giorno 4");
    fakeNow = new Date("2026-12-05T11:00:01Z"); // 12:00:01 Rome
    act(() => { vi.advanceTimersByTime(5000); });
    const scene = screen.getByTestId("tv-advent");
    expect(scene.dataset["day"]).toBe("5");
    expect(screen.getByTestId("tv-advent-note").textContent).toContain("Messaggio del giorno 5");
    expect(scene.querySelectorAll(".advent-plaque")).toHaveLength(24);
    act(() => { vi.advanceTimersByTime(CEREMONY_MS + 1000); });
    expect(screen.queryByTestId("tv-advent")).toBeNull();
    expect(screen.getByTestId("tv-kindness").textContent).toContain("Messaggio del giorno 5");
  });

  it("does not open at 10:00 any more", () => {
    fakeNow = new Date("2026-12-05T08:59:50Z"); // 09:59:50 Rome
    render(<TvKindness reduced={false} />);
    fakeNow = new Date("2026-12-05T09:00:05Z"); // 10:00:05 Rome
    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.queryByTestId("tv-advent")).toBeNull();
    expect(screen.getByTestId("tv-kindness").textContent).toContain("Messaggio del giorno 4");
  });

  it("shows the current message straight away after a reload past 12:00, without the ceremony", () => {
    fakeNow = new Date("2026-12-05T13:00:00Z");
    render(<TvKindness reduced={false} />);
    act(() => { vi.advanceTimersByTime(20000); });
    expect(screen.queryByTestId("tv-advent")).toBeNull();
    expect(screen.getByTestId("tv-kindness").textContent).toContain("Messaggio del giorno 5");
  });

  it("never starts the ceremony by itself in the preview", () => {
    fakeNow = new Date("2026-12-05T10:59:50Z");
    render(<TvKindness reduced={false} preview />);
    fakeNow = new Date("2026-12-05T11:00:01Z");
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByTestId("tv-advent")).toBeNull();
  });

  it("preview simulation uses a labelled DEMO text when the real door is not public yet", () => {
    fakeNow = new Date("2026-10-27T10:00:00Z");
    render(<TvKindness reduced={false} preview advent={{ day: 18, elapsed: 9000 }} />);
    expect(screen.getByTestId("tv-advent").dataset["phase"]).toBe("message");
    expect(screen.getByTestId("tv-advent-note").textContent).toContain("Esempio · DEMO");
  });

  it("shows a preview before 1 December", () => {
    fakeNow = new Date("2026-10-27T10:00:00Z");
    render(<TvKindness reduced={false} />);
    expect(screen.getByTestId("tv-kindness").dataset["phase"]).toBe("preview");
    expect(screen.getByTestId("tv-kindness").textContent).toContain("mezzogiorno");
  });
});
