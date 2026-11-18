import { describe, expect, it } from "vitest";
import { PROJECT_STATUSES, statusBadgeClass, statusLabel } from "./status";

describe("project status", () => {
  it("lists the 5 statuses in the same order as the database enum", () => {
    expect(PROJECT_STATUSES).toEqual([
      "inquiry",
      "consultation",
      "retainer_paid",
      "awaiting_event",
      "gallery_delivered",
    ]);
  });

  it("gives every status a readable label", () => {
    expect(PROJECT_STATUSES.map(statusLabel)).toEqual([
      "Inquiry",
      "Consultation",
      "Retainer Paid",
      "Awaiting Event",
      "Gallery Delivered",
    ]);
  });

  it("gives every status its own background and text color classes", () => {
    expect(statusBadgeClass("retainer_paid")).toBe(
      "bg-status-retainer-paid-bg text-status-retainer-paid-fg",
    );
    const classes = PROJECT_STATUSES.map(statusBadgeClass);
    expect(new Set(classes).size).toBe(5);
  });
});
