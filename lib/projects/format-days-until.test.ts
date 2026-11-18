import { describe, expect, it } from "vitest";
import { formatDaysUntil } from "./format-days-until";

describe("formatDaysUntil", () => {
  it("says today for 0", () => {
    expect(formatDaysUntil(0)).toBe("today");
  });

  it("says tomorrow and yesterday for 1 and -1", () => {
    expect(formatDaysUntil(1)).toBe("tomorrow");
    expect(formatDaysUntil(-1)).toBe("yesterday");
  });

  it("says in N days for the future", () => {
    expect(formatDaysUntil(2)).toBe("in 2 days");
    expect(formatDaysUntil(12)).toBe("in 12 days");
  });

  it("says N days ago for the past", () => {
    expect(formatDaysUntil(-2)).toBe("2 days ago");
    expect(formatDaysUntil(-30)).toBe("30 days ago");
  });
});
