import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";

// Returns the sources of one directive, e.g. directive(csp, "script-src").
function directive(csp: string, name: string): string[] {
  const part = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `) || d === name);
  return part ? part.split(" ").slice(1) : [];
}

describe("buildCsp", () => {
  const prod = buildCsp("abc123", false);

  it("allows scripts only from the app itself and with this request's nonce", () => {
    expect(directive(prod, "script-src")).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
  });

  it("never allows inline scripts or eval in production", () => {
    expect(directive(prod, "script-src")).not.toContain("'unsafe-inline'");
    expect(directive(prod, "script-src")).not.toContain("'unsafe-eval'");
  });

  it("allows eval in development only (React debugging needs it)", () => {
    expect(directive(buildCsp("abc123", true), "script-src")).toContain("'unsafe-eval'");
  });

  it("keeps <style> tags under the nonce", () => {
    expect(directive(prod, "style-src")).toEqual(["'self'", "'nonce-abc123'"]);
  });

  it("allows style=\"...\" attributes only (React and Next.js set them; they cannot run code)", () => {
    expect(directive(prod, "style-src-attr")).toEqual(["'unsafe-inline'"]);
  });

  it("falls back to the app itself for everything not listed", () => {
    expect(directive(prod, "default-src")).toEqual(["'self'"]);
  });

  it("forbids plugins, foreign <base> tags and foreign form targets", () => {
    expect(directive(prod, "object-src")).toEqual(["'none'"]);
    expect(directive(prod, "base-uri")).toEqual(["'self'"]);
    expect(directive(prod, "form-action")).toEqual(["'self'"]);
  });

  it("forbids showing the app in a frame", () => {
    expect(directive(prod, "frame-ancestors")).toEqual(["'none'"]);
  });

  it("upgrades http to https in production but not in development (dev runs on http)", () => {
    expect(prod).toContain("upgrade-insecure-requests");
    expect(buildCsp("abc123", true)).not.toContain("upgrade-insecure-requests");
  });

  it("can switch the upgrade off for a production build served over plain http (local demo)", () => {
    expect(buildCsp("abc123", false, true)).not.toContain("upgrade-insecure-requests");
  });

  it("keeps the other protections when the upgrade is switched off", () => {
    const csp = buildCsp("abc123", false, true);
    expect(directive(csp, "script-src")).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
    expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
  });

  it("uses a different nonce for a different request", () => {
    expect(buildCsp("other", false)).toContain("'nonce-other'");
    expect(buildCsp("other", false)).not.toContain("abc123");
  });

  it("is a single line (a header value must not contain newlines)", () => {
    expect(prod).not.toMatch(/[\r\n]/);
  });
});
