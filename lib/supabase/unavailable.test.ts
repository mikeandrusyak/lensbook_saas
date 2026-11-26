import { describe, expect, it } from "vitest";
import { isServiceUnavailable, supabaseIsDown } from "./unavailable";

const BASE = "https://example.supabase.co";

describe("supabaseIsDown", () => {
  it("asks the Auth health endpoint with the anon key", async () => {
    let calledWith: { url: string; apikey: string | null } | null = null;
    const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
      calledWith = {
        url: String(input),
        apikey: new Headers(init?.headers).get("apikey"),
      };
      return new Response("{}", { status: 200 });
    };
    await supabaseIsDown(BASE, "anon", fakeFetch);
    expect(calledWith).toEqual({ url: `${BASE}/auth/v1/health`, apikey: "anon" });
  });

  it("is false when the health check answers 200", async () => {
    const ok = async () => new Response("{}", { status: 200 });
    expect(await supabaseIsDown(BASE, "anon", ok)).toBe(false);
  });

  it("is true when the health check answers with a server error", async () => {
    const paused = async () => new Response("", { status: 540 });
    expect(await supabaseIsDown(BASE, "anon", paused)).toBe(true);
  });

  it("is true when the request fails (no answer, timeout)", async () => {
    const broken = async (): Promise<Response> => {
      throw new TypeError("fetch failed");
    };
    expect(await supabaseIsDown(BASE, "anon", broken)).toBe(true);
  });
});

describe("isServiceUnavailable", () => {
  it("is false when there is no error", () => {
    expect(isServiceUnavailable(null)).toBe(false);
  });

  it("is true when the request never got an answer (no status)", () => {
    expect(isServiceUnavailable({})).toBe(true);
    expect(isServiceUnavailable({ status: 0 })).toBe(true);
  });

  it("is true for a server error, as from a paused project", () => {
    expect(isServiceUnavailable({ status: 503 })).toBe(true);
    expect(isServiceUnavailable({ status: 540 })).toBe(true);
  });

  it("is false for a client error such as a missing or expired session", () => {
    expect(isServiceUnavailable({ status: 400 })).toBe(false);
    expect(isServiceUnavailable({ status: 401 })).toBe(false);
  });
});
