import { describe, expect, it } from "vitest";
import { packageFormSchema } from "./package";

// Form fields always arrive as strings.
const valid = {
  name: "Essential",
  description: "Ceremony and couple portraits",
  price: "1200.50",
  durationHours: "3.5",
};

describe("packageFormSchema", () => {
  it("accepts valid data and turns price and hours into numbers", () => {
    expect(packageFormSchema.parse(valid)).toEqual({
      name: "Essential",
      description: "Ceremony and couple portraits",
      price: 1200.5,
      durationHours: 3.5,
    });
  });

  it("trims the name and rejects an empty or too long name", () => {
    expect(packageFormSchema.parse({ ...valid, name: "  Full  " }).name).toBe(
      "Full",
    );
    for (const name of ["", "   ", "a".repeat(101)]) {
      expect(packageFormSchema.safeParse({ ...valid, name }).success).toBe(false);
    }
  });

  it("turns a missing or blank description into null and limits its length", () => {
    expect(
      packageFormSchema.parse({ ...valid, description: "  " }).description,
    ).toBeNull();
    expect(
      packageFormSchema.parse({ ...valid, description: undefined }).description,
    ).toBeNull();
    expect(
      packageFormSchema.safeParse({ ...valid, description: "a".repeat(501) })
        .success,
    ).toBe(false);
  });

  it("accepts a price of 0 and whole numbers", () => {
    expect(packageFormSchema.parse({ ...valid, price: "0" }).price).toBe(0);
    expect(packageFormSchema.parse({ ...valid, price: "2200" }).price).toBe(2200);
  });

  it("rejects a price that is negative, not a number, or has more than 2 decimals", () => {
    for (const price of ["-1", "abc", "", "12.345", "1e3", "NaN"]) {
      expect(packageFormSchema.safeParse({ ...valid, price }).success).toBe(false);
    }
  });

  it("rejects a price above the database limit (numeric(10,2))", () => {
    expect(
      packageFormSchema.safeParse({ ...valid, price: "99999999.99" }).success,
    ).toBe(true);
    expect(
      packageFormSchema.safeParse({ ...valid, price: "100000000" }).success,
    ).toBe(false);
  });

  it("rejects hours that are zero, negative, not a number, or have more than 1 decimal", () => {
    for (const durationHours of ["0", "-2", "abc", "", "2.25"]) {
      expect(
        packageFormSchema.safeParse({ ...valid, durationHours }).success,
      ).toBe(false);
    }
  });

  it("rejects hours above the database limit (numeric(4,1))", () => {
    expect(
      packageFormSchema.safeParse({ ...valid, durationHours: "999.9" }).success,
    ).toBe(true);
    expect(
      packageFormSchema.safeParse({ ...valid, durationHours: "1000" }).success,
    ).toBe(false);
  });
});
