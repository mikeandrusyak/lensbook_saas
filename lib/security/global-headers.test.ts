import { describe, expect, it } from "vitest";
import { globalRoute } from "./global-headers";

const headers = Object.fromEntries(
  globalRoute.headers.map(({ key, value }) => [key, value]),
);

describe("globalRoute", () => {
  it("applies to every path", () => {
    expect(globalRoute.source).toBe("/:path*");
  });

  it("stops the browser from guessing content types", () => {
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("forbids showing the app inside a frame (clickjacking)", () => {
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("sends only the origin, not the full address, to other sites", () => {
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });
});
