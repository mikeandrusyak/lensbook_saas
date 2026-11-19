import { describe, expect, it } from "vitest";
import { contrastRatio, type Oklch } from "./contrast";

const black: Oklch = [0, 0, 0];
const white: Oklch = [1, 0, 0];

describe("contrastRatio", () => {
  it("is 21 for black on white and symmetric", () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
    expect(contrastRatio(white, black)).toBeCloseTo(21, 0);
  });

  it("is 1 for identical colors", () => {
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
  });
});

// These values are copied by hand from app/globals.css: keep them in sync.
const background: Oklch = [0.972, 0.012, 80];
const card: Oklch = [0.99, 0.006, 80];
const foreground: Oklch = [0.26, 0.03, 50];
const muted: Oklch = [0.48, 0.03, 55];
const primary: Oklch = [0.52, 0.13, 40];
const primaryForeground: Oklch = [0.985, 0.005, 80];
const accent: Oklch = [0.93, 0.025, 70];
const link: Oklch = [0.52, 0.13, 40];

const status = {
  inquiry: { bg: [0.93, 0.025, 80], fg: [0.38, 0.03, 70] },
  consultation: { bg: [0.92, 0.03, 190], fg: [0.36, 0.05, 190] },
  retainerPaid: { bg: [0.93, 0.07, 85], fg: [0.4, 0.08, 70] },
  awaitingEvent: { bg: [0.92, 0.04, 25], fg: [0.4, 0.1, 30] },
  galleryDelivered: { bg: [0.92, 0.05, 120], fg: [0.36, 0.07, 120] },
} satisfies Record<string, { bg: Oklch; fg: Oklch }>;

// WCAG AA for normal text
const AA = 4.5;

describe("palette contrast (WCAG AA)", () => {
  it("text on background", () => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA);
  });

  it("button text on primary", () => {
    expect(contrastRatio(primaryForeground, primary)).toBeGreaterThanOrEqual(AA);
  });

  it("text on accent (hover background)", () => {
    expect(contrastRatio(foreground, accent)).toBeGreaterThanOrEqual(AA);
  });

  it("text on card", () => {
    expect(contrastRatio(foreground, card)).toBeGreaterThanOrEqual(AA);
  });

  it("muted text on background and on card", () => {
    expect(contrastRatio(muted, background)).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(muted, card)).toBeGreaterThanOrEqual(AA);
  });

  it("link on background", () => {
    expect(contrastRatio(link, background)).toBeGreaterThanOrEqual(AA);
  });

  it.each(Object.entries(status))("status badge %s", (_name, { bg, fg }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA);
  });
});
