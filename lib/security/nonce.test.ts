import { describe, expect, it } from "vitest";
import { generateNonce } from "./nonce";

describe("generateNonce", () => {
  it("encodes 32 random bytes as base64 (44 characters)", () => {
    expect(generateNonce()).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  });

  it("gives a different value on every call", () => {
    const nonces = new Set(Array.from({ length: 100 }, () => generateNonce()));
    expect(nonces.size).toBe(100);
  });

  it("only uses characters that are valid inside a CSP 'nonce-...' source", () => {
    // Next.js accepts A-Z a-z 0-9 + / _ - and up to two trailing =.
    expect(generateNonce()).toMatch(/^[A-Za-z0-9+/_-]+={0,2}$/);
  });
});
