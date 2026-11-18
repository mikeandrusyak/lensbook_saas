import { describe, expect, it } from "vitest";
import { loginSchema, signUpSchema } from "./auth";

const email = "anna@example.test";
const password = "correct-horse-battery";

describe("signUpSchema", () => {
  it("accepts a valid email and password", () => {
    expect(signUpSchema.safeParse({ email, password }).success).toBe(true);
  });

  it("trims and lowercases the email", () => {
    const result = signUpSchema.parse({ email: "  Anna@Example.TEST ", password });
    expect(result.email).toBe("anna@example.test");
  });

  it("rejects a malformed email", () => {
    expect(signUpSchema.safeParse({ email: "not-an-email", password }).success).toBe(
      false,
    );
  });

  it("rejects an email longer than 254 characters", () => {
    const long = `${"a".repeat(250)}@example.test`;
    expect(signUpSchema.safeParse({ email: long, password }).success).toBe(false);
  });

  it("rejects a password shorter than 12 characters", () => {
    expect(signUpSchema.safeParse({ email, password: "short-pw-11" }).success).toBe(
      false,
    );
  });

  it("rejects a password longer than 72 bytes", () => {
    expect(
      signUpSchema.safeParse({ email, password: "a".repeat(73) }).success,
    ).toBe(false);
    // 40 two-byte characters are 80 bytes, although only 40 characters long
    expect(
      signUpSchema.safeParse({ email, password: "é".repeat(40) }).success,
    ).toBe(false);
  });

  it("does not trim the password", () => {
    const spaced = "  twelve chars  ";
    expect(signUpSchema.parse({ email, password: spaced }).password).toBe(spaced);
  });

  it("rejects missing fields and non-string values", () => {
    expect(signUpSchema.safeParse({}).success).toBe(false);
    expect(signUpSchema.safeParse({ email, password: 123456789012 }).success).toBe(
      false,
    );
  });
});

describe("loginSchema", () => {
  it("accepts any non-empty password up to 72 bytes", () => {
    expect(loginSchema.safeParse({ email, password: "x" }).success).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email, password: "" }).success).toBe(false);
  });

  it("rejects a password longer than 72 bytes", () => {
    expect(loginSchema.safeParse({ email, password: "a".repeat(73) }).success).toBe(
      false,
    );
  });

  it("normalizes the email like sign-up", () => {
    expect(loginSchema.parse({ email: " ANNA@example.test", password: "x" }).email).toBe(
      "anna@example.test",
    );
  });
});
