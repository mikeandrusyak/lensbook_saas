import { describe, expect, it } from "vitest";
import { daysUntil } from "./days-until";

describe("daysUntil", () => {
  const today = new Date(2026, 5, 15, 10, 0, 0); // 15 June 2026, local time

  it("returns 0 for the same day", () => {
    expect(daysUntil("2026-06-15", today)).toBe(0);
  });

  it("returns 1 for tomorrow and -1 for yesterday", () => {
    expect(daysUntil("2026-06-16", today)).toBe(1);
    expect(daysUntil("2026-06-14", today)).toBe(-1);
  });

  it("returns 30 for a date 30 days ahead", () => {
    expect(daysUntil("2026-07-15", today)).toBe(30);
  });

  it("counts whole calendar days across the daylight saving change", () => {
    const before = new Date(2026, 2, 28, 12, 0, 0);
    expect(daysUntil("2026-03-30", before)).toBe(2);
  });

  it("counts across the end of the year", () => {
    const late = new Date(2026, 11, 30, 12, 0, 0);
    expect(daysUntil("2027-01-02", late)).toBe(3);
  });

  it("ignores the time of day in today", () => {
    const lateEvening = new Date(2026, 5, 15, 23, 59, 59);
    expect(daysUntil("2026-06-15", lateEvening)).toBe(0);
  });

  it("throws on an invalid date string", () => {
    expect(() => daysUntil("abc", today)).toThrow();
    expect(() => daysUntil("2026-13-45", today)).toThrow();
    expect(() => daysUntil("2026-02-30", today)).toThrow();
  });
});
