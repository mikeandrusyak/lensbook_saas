import { describe, expect, it } from "vitest";
import { bookingRoute } from "./booking-headers";

const headers = Object.fromEntries(
  bookingRoute.headers.map(({ key, value }) => [key, value]),
);

describe("bookingRoute", () => {
  it("applies to every path under /book/ and nothing else", () => {
    expect(bookingRoute.source).toBe("/book/:path*");
  });

  it("sends no Referer, so the token in the URL never reaches another site", () => {
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
  });

  it("forbids storing the page (it contains the couple's data)", () => {
    expect(headers["Cache-Control"]).toBe("no-store");
  });

  it("asks search engines not to index booking links", () => {
    expect(headers["X-Robots-Tag"]).toBe("noindex, nofollow");
  });
});
