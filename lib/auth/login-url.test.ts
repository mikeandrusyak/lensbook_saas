import { describe, expect, it } from "vitest";
import { loginRedirectUrl } from "./login-url";

describe("loginRedirectUrl", () => {
  it("remembers the page the user wanted", () => {
    expect(loginRedirectUrl("/projects/abc")).toBe("/login?next=%2Fprojects%2Fabc");
  });

  it("encodes characters that would break the query string", () => {
    expect(loginRedirectUrl("/a&b=c")).toBe("/login?next=%2Fa%26b%3Dc");
  });

  it("sends the home page to a plain /login", () => {
    expect(loginRedirectUrl("/")).toBe("/login");
  });

  it("does not point /login back to itself", () => {
    expect(loginRedirectUrl("/login")).toBe("/login");
    expect(loginRedirectUrl("/signup")).toBe("/login");
  });
});
