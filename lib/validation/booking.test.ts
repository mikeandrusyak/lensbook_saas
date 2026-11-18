import { describe, expect, it } from "vitest";
import {
  bookingFormSchema,
  bookingTokenSchema,
  bookingViewSchema,
  packageSnapshotSchema,
} from "./booking";

describe("bookingTokenSchema", () => {
  it("accepts a token shaped like ours: 43 characters of base64url", () => {
    // 32 bytes as base64url is always 43 characters, no padding.
    const token = "A".repeat(20) + "-_" + "b9".repeat(10) + "x";
    expect(token).toHaveLength(43);
    expect(bookingTokenSchema.safeParse(token).success).toBe(true);
  });

  it("rejects anything else, so garbage never reaches the database", () => {
    const bad = [
      "",
      "short",
      "A".repeat(42),
      "A".repeat(44),
      "A".repeat(42) + "=", // padding is not part of base64url
      "A".repeat(42) + "+", // "+" and "/" are plain base64, not base64url
      "A".repeat(42) + "/",
      "A".repeat(42) + " ",
      "<script>".padEnd(43, "A"),
      null,
      undefined,
    ];
    for (const value of bad) {
      expect(bookingTokenSchema.safeParse(value).success).toBe(false);
    }
  });
});

// Form fields always arrive as strings; a ticked checkbox sends "on", an unticked one nothing.
const valid = {
  packageId: "3f2b8c1e-5d4a-4b7e-9c1a-2e6f8a0b4d5c",
  signerName: "Anna Muster",
  consent: "on",
  names: "Anna & Ben",
  location: "Lake venue",
};

describe("bookingFormSchema", () => {
  it("accepts valid data and turns the ticked checkbox into true", () => {
    expect(bookingFormSchema.parse(valid)).toEqual({
      packageId: valid.packageId,
      signerName: "Anna Muster",
      consent: true,
      names: "Anna & Ben",
      location: "Lake venue",
    });
  });

  it("requires a uuid as package id", () => {
    for (const packageId of ["", "abc", "123", undefined]) {
      expect(bookingFormSchema.safeParse({ ...valid, packageId }).success).toBe(
        false,
      );
    }
  });

  it("trims the signature and rejects an empty or too long one", () => {
    expect(
      bookingFormSchema.parse({ ...valid, signerName: "  Anna Muster  " })
        .signerName,
    ).toBe("Anna Muster");
    for (const signerName of ["", "   ", "a".repeat(201), undefined]) {
      expect(
        bookingFormSchema.safeParse({ ...valid, signerName }).success,
      ).toBe(false);
    }
    expect(
      bookingFormSchema.safeParse({ ...valid, signerName: "a".repeat(200) })
        .success,
    ).toBe(true);
  });

  it("requires consent: an unticked checkbox (missing) or any other value fails", () => {
    for (const consent of [undefined, "", "off", "true", "yes"]) {
      expect(bookingFormSchema.safeParse({ ...valid, consent }).success).toBe(
        false,
      );
    }
  });

  it("makes names and location optional: missing or blank becomes null", () => {
    const parsed = bookingFormSchema.parse({
      ...valid,
      names: "   ",
      location: undefined,
    });
    expect(parsed.names).toBeNull();
    expect(parsed.location).toBeNull();
  });

  it("limits names and location to 200 characters", () => {
    for (const field of ["names", "location"]) {
      expect(
        bookingFormSchema.safeParse({ ...valid, [field]: "a".repeat(200) })
          .success,
      ).toBe(true);
      expect(
        bookingFormSchema.safeParse({ ...valid, [field]: "a".repeat(201) })
          .success,
      ).toBe(false);
    }
  });

  it("does not remove HTML: it only checks shape, React escapes on output", () => {
    const html = "<script>alert(1)</script>";
    expect(
      bookingFormSchema.parse({ ...valid, signerName: html }).signerName,
    ).toBe(html);
  });
});

// What get_booking returns (a jsonb value, typed only as Json by the generated types).
const view = {
  names: "Anna & Ben",
  event_date: "2027-05-15",
  location: "Lake venue",
  already_signed: false,
  packages: [
    {
      id: "3f2b8c1e-5d4a-4b7e-9c1a-2e6f8a0b4d5c",
      name: "Essential",
      description: null,
      price: 1200.5,
      duration_hours: 3.5,
    },
  ],
};

describe("bookingViewSchema", () => {
  it("accepts what get_booking returns", () => {
    expect(bookingViewSchema.parse(view)).toEqual(view);
  });

  it("accepts a missing date and location, and no packages", () => {
    const parsed = bookingViewSchema.safeParse({
      ...view,
      event_date: null,
      location: null,
      packages: [],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects null (no such token) and shapes that do not match", () => {
    for (const value of [null, undefined, "", 42, {}, { ...view, names: 1 }]) {
      expect(bookingViewSchema.safeParse(value).success).toBe(false);
    }
    expect(
      bookingViewSchema.safeParse({ ...view, packages: [{ id: "x" }] }).success,
    ).toBe(false);
  });
});

// contracts.package_snapshot is a jsonb column, typed only as Json by the generated types.
describe("packageSnapshotSchema", () => {
  const snapshot = {
    name: "Essential",
    description: null,
    price: 1200.5,
    duration_hours: 3.5,
  };

  it("accepts the snapshot that submit_booking writes", () => {
    expect(packageSnapshotSchema.parse(snapshot)).toEqual(snapshot);
  });

  it("accepts a description", () => {
    expect(
      packageSnapshotSchema.safeParse({ ...snapshot, description: "Portraits" })
        .success,
    ).toBe(true);
  });

  it("rejects anything else", () => {
    for (const value of [null, "", 42, {}, { ...snapshot, price: "1200" }]) {
      expect(packageSnapshotSchema.safeParse(value).success).toBe(false);
    }
  });
});
