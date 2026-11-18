import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it("keeps a relative path", () => {
    expect(safeRedirectPath("/projects")).toBe("/projects");
  });

  it("keeps a relative path with a query", () => {
    expect(safeRedirectPath("/projects?page=2")).toBe("/projects?page=2");
  });

  it("falls back to /dashboard when there is no value", () => {
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath("")).toBe("/dashboard");
  });

  it("falls back for values that are not strings", () => {
    expect(safeRedirectPath(42)).toBe("/dashboard");
    expect(safeRedirectPath(["/projects"])).toBe("/dashboard");
  });

  it("rejects absolute urls", () => {
    expect(safeRedirectPath("https://evil.test")).toBe("/dashboard");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("rejects a path without a leading slash", () => {
    expect(safeRedirectPath("projects")).toBe("/dashboard");
  });

  it("rejects protocol-relative urls", () => {
    expect(safeRedirectPath("//evil.test")).toBe("/dashboard");
  });

  it("rejects backslashes, which browsers treat like slashes", () => {
    expect(safeRedirectPath("/\\evil.test")).toBe("/dashboard");
    expect(safeRedirectPath("/\\/evil.test")).toBe("/dashboard");
  });

  it("rejects control characters, which browsers strip from urls", () => {
    expect(safeRedirectPath("/\t/evil.test")).toBe("/dashboard");
    expect(safeRedirectPath("/\n/evil.test")).toBe("/dashboard");
  });
});
