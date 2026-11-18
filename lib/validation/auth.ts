import { z } from "zod";

// 254 is the maximum length of an email address (RFC 5321)
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());

// bcrypt, which Supabase Auth uses, only looks at the first 72 bytes of a password,
// so the limit is counted in bytes, not characters. The password is never trimmed.
const MAX_PASSWORD_BYTES = 72;
const withinByteLimit = (value: string) =>
  new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES;

export const signUpSchema = z.object({
  email,
  password: z.string().min(12).refine(withinByteLimit),
});

// Login does not enforce the sign-up rules, so the form does not hint at them.
export const loginSchema = z.object({
  email,
  password: z.string().min(1).refine(withinByteLimit),
});
