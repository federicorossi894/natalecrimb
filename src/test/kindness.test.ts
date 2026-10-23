import { describe, expect, it } from "vitest";
import { calendarPhase, ceremonyDue, ceremonyKey, tvDay, unlockedDay } from "@/lib/kindness";

const at = (iso: string) => new Date(iso);

describe("Calendario della Gentilezza · Europe/Rome dates", () => {
  it("opens door 1 at midnight Rome time on 1 December, not at UTC midnight", () => {
    expect(unlockedDay(at("2026-11-30T22:59:59Z"))).toBe(0); // 23:59:59 in Rome, 30 Nov
    expect(unlockedDay(at("2026-11-30T23:00:00Z"))).toBe(1); // 00:00 in Rome, 1 Dec
  });

  it("follows the Rome date even when UTC is still the day before", () => {
    expect(unlockedDay(at("2026-12-05T23:30:00Z"))).toBe(6);
  });

  it("caps at 24 doors and stays fully open after Christmas Eve until January", () => {
    expect(unlockedDay(at("2026-12-24T22:59:00Z"))).toBe(24);
    expect(unlockedDay(at("2026-12-26T10:00:00Z"))).toBe(24);
    expect(unlockedDay(at("2027-01-10T10:00:00Z"))).toBe(24);
    expect(unlockedDay(at("2026-10-23T10:00:00Z"))).toBe(0);
  });

  it("is in preview before 1 December, open 1–24 December, closed after", () => {
    expect(calendarPhase(at("2026-10-27T10:00:00Z"))).toBe("preview");
    expect(calendarPhase(at("2026-12-01T09:00:00Z"))).toBe("open");
    expect(calendarPhase(at("2026-12-24T20:00:00Z"))).toBe("open");
    expect(calendarPhase(at("2026-12-25T00:30:00Z"))).toBe("closed");
  });
});

describe("Casetta TV · 10:00 opening", () => {
  it("shows yesterday's door before 10:00 Rome and today's from 10:00", () => {
    expect(tvDay(at("2026-12-05T08:59:00Z"))).toBe(4); // 09:59 Rome
    expect(tvDay(at("2026-12-05T09:00:00Z"))).toBe(5); // 10:00 Rome
    expect(tvDay(at("2026-12-01T08:00:00Z"))).toBe(0); // nothing open before the first ceremony
  });

  it("plays the ceremony only when 10:00 passes while the screen is on", () => {
    const d = at("2026-12-05T09:00:05Z");
    expect(ceremonyDue(4, 5, "open", null, ceremonyKey(d, 5))).toBe(true);
  });

  it("never plays it on a screen started or reloaded after 10:00", () => {
    const d = at("2026-12-05T11:00:00Z");
    expect(ceremonyDue(null, 5, "open", null, ceremonyKey(d, 5))).toBe(false);
  });

  it("plays it at most once per day per screen", () => {
    const d = at("2026-12-05T09:00:05Z");
    expect(ceremonyDue(4, 5, "open", ceremonyKey(d, 5), ceremonyKey(d, 5))).toBe(false);
  });

  it("does not play it after Christmas Eve", () => {
    const d = at("2026-12-25T09:00:05Z");
    expect(ceremonyDue(24, 24, "closed", null, ceremonyKey(d, 24))).toBe(false);
  });
});
