import { describe, expect, it } from "vitest";
import { generateToken, hashToken, hashToPostgres } from "./tokens";

describe("generateToken", () => {
  it("is 32 random bytes as base64url: 43 URL-safe characters", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("gives a different token every time", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateToken));
    expect(tokens.size).toBe(100);
  });
});

describe("hashToken", () => {
  it("is SHA-256 (known test vector for 'abc')", () => {
    expect(hashToken("abc").toString("hex")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is 32 bytes and always the same for the same token", () => {
    const token = generateToken();
    expect(hashToken(token)).toHaveLength(32);
    expect(hashToken(token).equals(hashToken(token))).toBe(true);
  });

  it("differs from the token itself", () => {
    const token = generateToken();
    expect(hashToken(token).toString("base64url")).not.toBe(token);
  });
});

describe("hashToPostgres", () => {
  it("writes a hash as a bytea hex string: backslash, x, 64 hex digits", () => {
    expect(hashToPostgres(hashToken("abc"))).toBe(
      "\\xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
