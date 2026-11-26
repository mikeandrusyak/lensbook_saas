import { describe, expect, it } from "vitest";
import { decideAccess } from "./routes";

describe("decideAccess", () => {
  it("sends an anonymous visitor from a protected page to login", () => {
    expect(decideAccess("/dashboard", false)).toBe("to-login");
  });

  it("protects every path that is not on the public list", () => {
    expect(decideAccess("/projects/1", false)).toBe("to-login");
    expect(decideAccess("/anything-new", false)).toBe("to-login");
  });

  it("lets a logged-in user into a protected page", () => {
    expect(decideAccess("/dashboard", true)).toBe("allow");
  });

  it("lets everyone see the start page", () => {
    expect(decideAccess("/", false)).toBe("allow");
    expect(decideAccess("/", true)).toBe("allow");
  });

  it("lets everyone see the 'service unavailable' page", () => {
    expect(decideAccess("/unavailable", false)).toBe("allow");
    expect(decideAccess("/unavailable", true)).toBe("allow");
  });

  it("lets an anonymous visitor open login and sign-up", () => {
    expect(decideAccess("/login", false)).toBe("allow");
    expect(decideAccess("/signup", false)).toBe("allow");
  });

  it("sends a logged-in user away from login and sign-up", () => {
    expect(decideAccess("/login", true)).toBe("to-dashboard");
    expect(decideAccess("/signup", true)).toBe("to-dashboard");
  });

  it("keeps booking pages public for everyone", () => {
    expect(decideAccess("/book/abc123", false)).toBe("allow");
    expect(decideAccess("/book/abc123", true)).toBe("allow");
  });

  it("does not treat a similar prefix as public", () => {
    expect(decideAccess("/booking", false)).toBe("to-login");
    expect(decideAccess("/book", false)).toBe("to-login");
    expect(decideAccess("/login-admin", false)).toBe("to-login");
  });

  it("ignores a trailing slash", () => {
    expect(decideAccess("/login/", true)).toBe("to-dashboard");
    expect(decideAccess("/dashboard/", false)).toBe("to-login");
  });
});
