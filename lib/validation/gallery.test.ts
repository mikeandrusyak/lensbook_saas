import { describe, expect, it } from "vitest";
import { galleryUrlSchema } from "./gallery";

describe("galleryUrlSchema", () => {
  it("accepts an https link and trims spaces around it", () => {
    expect(
      galleryUrlSchema.parse("  https://gallery.example.com/anna-and-ben  "),
    ).toBe("https://gallery.example.com/anna-and-ben");
  });

  it("rejects other schemes, including javascript: and data:", () => {
    for (const value of [
      "http://gallery.example.com",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "ftp://gallery.example.com",
      "//gallery.example.com",
    ]) {
      expect(galleryUrlSchema.safeParse(value).success).toBe(false);
    }
  });

  it("rejects upper-case HTTPS, because the database check is case-sensitive", () => {
    expect(
      galleryUrlSchema.safeParse("HTTPS://gallery.example.com").success,
    ).toBe(false);
  });

  it("rejects empty values and text that is not a URL", () => {
    for (const value of ["", "   ", "https://", "gallery", "https://exa mple.com"]) {
      expect(galleryUrlSchema.safeParse(value).success).toBe(false);
    }
  });

  it("rejects a link with a user name or password in it", () => {
    for (const value of [
      "https://user:secret@gallery.example.com",
      "https://user@gallery.example.com",
    ]) {
      expect(galleryUrlSchema.safeParse(value).success).toBe(false);
    }
  });

  it("limits the length to 2000 characters", () => {
    const base = "https://gallery.example.com/";
    const ok = base + "a".repeat(2000 - base.length);
    expect(galleryUrlSchema.safeParse(ok).success).toBe(true);
    expect(galleryUrlSchema.safeParse(ok + "a").success).toBe(false);
  });

  it("rejects values that are not strings", () => {
    for (const value of [null, undefined, 42]) {
      expect(galleryUrlSchema.safeParse(value).success).toBe(false);
    }
  });
});
