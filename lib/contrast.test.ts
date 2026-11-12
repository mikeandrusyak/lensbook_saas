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
const background: Oklch = [0.985, 0.005, 85];
const foreground: Oklch = [0.24, 0.01, 60];
const primary: Oklch = [0.3, 0.01, 60];
const primaryForeground: Oklch = [0.985, 0, 0];
const accent: Oklch = [0.92, 0.03, 85];
const link: Oklch = [0.5, 0.09, 215];

const status = {
  inquiry: { bg: [0.93, 0.01, 80], fg: [0.35, 0.01, 70] },
  consultation: { bg: [0.92, 0.04, 250], fg: [0.35, 0.1, 250] },
  retainerPaid: { bg: [0.93, 0.07, 80], fg: [0.4, 0.09, 70] },
  awaitingEvent: { bg: [0.92, 0.04, 300], fg: [0.36, 0.11, 300] },
  galleryDelivered: { bg: [0.92, 0.05, 150], fg: [0.36, 0.09, 150] },
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

  it("link on background", () => {
    expect(contrastRatio(link, background)).toBeGreaterThanOrEqual(AA);
  });

  it.each(Object.entries(status))("status badge %s", (_name, { bg, fg }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA);
  });
});
