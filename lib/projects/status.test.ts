import { describe, expect, it } from "vitest";
import {
  forwardButtonText,
  neighborStatus,
  PROJECT_STATUSES,
  statusBadgeClass,
  statusLabel,
} from "./status";

describe("neighborStatus", () => {
  it("moves one step forward", () => {
    expect(neighborStatus("inquiry", "forward")).toBe("consultation");
    expect(neighborStatus("consultation", "forward")).toBe("retainer_paid");
    expect(neighborStatus("retainer_paid", "forward")).toBe("awaiting_event");
    expect(neighborStatus("awaiting_event", "forward")).toBe(
      "gallery_delivered",
    );
  });

  it("moves one step back", () => {
    expect(neighborStatus("gallery_delivered", "back")).toBe("awaiting_event");
    expect(neighborStatus("awaiting_event", "back")).toBe("retainer_paid");
    expect(neighborStatus("retainer_paid", "back")).toBe("consultation");
    expect(neighborStatus("consultation", "back")).toBe("inquiry");
  });

  it("returns null at the ends", () => {
    expect(neighborStatus("inquiry", "back")).toBe(null);
    expect(neighborStatus("gallery_delivered", "forward")).toBe(null);
  });
});

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

describe("forwardButtonText", () => {
  it('says "Deposit received" in Consultation, where the next step is Retainer Paid', () => {
    expect(forwardButtonText("consultation")).toBe("Deposit received");
  });

  it('says "Next" for every other status', () => {
    for (const status of [
      "inquiry",
      "retainer_paid",
      "awaiting_event",
      "gallery_delivered",
    ] as const) {
      expect(forwardButtonText(status)).toBe("Next");
    }
  });
});
