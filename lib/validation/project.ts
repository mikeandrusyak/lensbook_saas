import { z } from "zod";
import { daysUntil } from "../projects/days-until";
import { email } from "./auth";

// Optional text from a form: missing or blank becomes null (the database column is nullable).
const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => value || null);

// daysUntil throws on anything that is not a real YYYY-MM-DD date,
// so the rule "what is a valid date" lives in one place.
const isRealDate = (value: string) => {
  try {
    daysUntil(value, new Date());
    return true;
  } catch {
    return false;
  }
};

const eventDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null)
  .refine((value) => value === null || isRealDate(value));

// The project id comes from the URL or a form field, so the user controls it.
// A malformed value would make Postgres fail with a type error; reject it earlier.
export const projectIdSchema = z.uuid();

// Only checks the shape and length. It does not remove HTML: React escapes text on render.
export const projectFormSchema = z.object({
  names: z.string().trim().min(1).max(200),
  email,
  eventDate,
  location: optionalText,
});
