import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names and skips falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("lets the later Tailwind class win on conflict", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
