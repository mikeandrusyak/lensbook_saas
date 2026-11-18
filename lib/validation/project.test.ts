import { describe, expect, it } from "vitest";
import { projectFormSchema, projectIdSchema } from "./project";

describe("projectIdSchema", () => {
  it("accepts a uuid", () => {
    const id = "3f2b8c1e-5d4a-4b7e-9c1a-2e6f8a0b4d5c";
    expect(projectIdSchema.safeParse(id).success).toBe(true);
  });

  it("rejects anything that is not a uuid", () => {
    for (const value of ["", "abc", "123", "3f2b8c1e-5d4a-4b7e-9c1a", null]) {
      expect(projectIdSchema.safeParse(value).success).toBe(false);
    }
  });
});

const valid = {
  names: "Anna & Max Example",
  email: "anna@example.test",
  eventDate: "2026-11-30",
  location: "Zurich",
};

describe("projectFormSchema", () => {
  it("accepts valid data", () => {
    expect(projectFormSchema.parse(valid)).toEqual(valid);
  });

  it("trims names and rejects empty names", () => {
    expect(projectFormSchema.parse({ ...valid, names: "  Anna  " }).names).toBe(
      "Anna",
    );
    expect(projectFormSchema.safeParse({ ...valid, names: "   " }).success).toBe(
      false,
    );
  });

  it("rejects names longer than 200 characters", () => {
    const long = "a".repeat(201);
    expect(projectFormSchema.safeParse({ ...valid, names: long }).success).toBe(
      false,
    );
  });

  it("normalizes the email and rejects a malformed one", () => {
    const result = projectFormSchema.parse({
      ...valid,
      email: "  Anna@Example.TEST ",
    });
    expect(result.email).toBe("anna@example.test");
    expect(
      projectFormSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("turns an empty or missing event date into null", () => {
    expect(projectFormSchema.parse({ ...valid, eventDate: "" }).eventDate).toBe(
      null,
    );
    expect(
      projectFormSchema.parse({ ...valid, eventDate: undefined }).eventDate,
    ).toBe(null);
  });

  it("rejects an event date that is not a real date", () => {
    for (const eventDate of ["2026-02-30", "abc", "30.11.2026"]) {
      expect(
        projectFormSchema.safeParse({ ...valid, eventDate }).success,
      ).toBe(false);
    }
  });

  it("turns an empty or missing location into null", () => {
    expect(projectFormSchema.parse({ ...valid, location: "  " }).location).toBe(
      null,
    );
    expect(
      projectFormSchema.parse({ ...valid, location: undefined }).location,
    ).toBe(null);
  });

  it("rejects a location longer than 200 characters", () => {
    const long = "a".repeat(201);
    expect(
      projectFormSchema.safeParse({ ...valid, location: long }).success,
    ).toBe(false);
  });

  it("keeps HTML as plain text: escaping is done by React when rendering", () => {
    const names = "<script>alert(1)</script>";
    expect(projectFormSchema.parse({ ...valid, names }).names).toBe(names);
  });
});
