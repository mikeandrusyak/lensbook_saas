import { describe, expect, it } from "vitest";
import { getSupabaseEnv } from "./env";

const url = "https://example-project.supabase.co";
const anonKey = "fake-anon-key-for-tests";

describe("getSupabaseEnv", () => {
  it("returns url and anon key when both are set", () => {
    expect(getSupabaseEnv({ url, anonKey })).toEqual({ url, anonKey });
  });

  it("names the missing variable when the url is missing", () => {
    expect(() => getSupabaseEnv({ url: undefined, anonKey })).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL",
    );
  });

  it("names the missing variable when the anon key is missing", () => {
    expect(() => getSupabaseEnv({ url, anonKey: "" })).toThrow(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  });

  it("rejects a url that is not https", () => {
    expect(() => getSupabaseEnv({ url: "http://example.test", anonKey })).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL",
    );
  });

  it("never puts the key or the url into an error message", () => {
    const badUrl = "http://secret-host.example.test";
    let message = "";
    try {
      getSupabaseEnv({ url: badUrl, anonKey });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toContain("secret-host");
    expect(message).not.toContain(anonKey);
  });
});
