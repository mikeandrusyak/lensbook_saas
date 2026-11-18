import { z } from "zod";

// A decimal number as typed in a form: digits with at most `decimals` places.
// A regex (not Number()) so that "1e3", "NaN" and "12.345" are rejected before conversion.
const decimalString = (decimals: number) =>
  z.string().trim().regex(new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`));

// Limits follow the columns: price numeric(10,2), duration_hours numeric(4,1).
const price = decimalString(2)
  .transform(Number)
  .refine((value) => value <= 99_999_999.99);

const durationHours = decimalString(1)
  .transform(Number)
  .refine((value) => value > 0 && value <= 999.9);

// Missing or blank description becomes null (the column is nullable).
const description = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => value || null);

// The package id comes from the URL or a hidden form field, so the user controls it.
// A malformed value would make Postgres fail with a type error; reject it earlier.
export const packageIdSchema = z.uuid();

// Only checks shape and length. It does not remove HTML: React escapes text on render.
export const packageFormSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description,
  price,
  durationHours,
});
