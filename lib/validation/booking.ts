import { z } from "zod";
import { galleryUrlSchema } from "./gallery";

// The token comes from the URL (/book/[token]), so the visitor controls it.
// Ours is 32 random bytes as base64url: always exactly 43 characters from [A-Za-z0-9_-].
// Anything else cannot be a real token, so it is rejected before the database is asked.
export const bookingTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

// Optional text field: missing or blank becomes null. Limit 200 matches submit_booking.
const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => value || null);

// Only checks shape and length. It does not remove HTML: React escapes text on render.
// The limits repeat the ones inside submit_booking, which checks everything again.
export const bookingFormSchema = z.object({
  packageId: z.uuid(),
  // Typed signature: the full name of the person signing.
  signerName: z.string().trim().min(1).max(200),
  // A ticked checkbox sends "on"; an unticked one sends nothing. Only "on" counts as consent.
  consent: z.literal("on").transform(() => true as const),
  names: optionalText,
  location: optionalText,
});

// The answer of get_booking. The generated types only say "Json", so the shape is checked
// here instead of being cast. null (unknown token) fails this schema on purpose.
export const bookingViewSchema = z.object({
  names: z.string(),
  event_date: z.string().nullable(),
  location: z.string().nullable(),
  // null until Gallery Delivered (get_booking decides). The database allows only https,
  // and it is checked again here, because this value becomes the href of a link.
  gallery_url: galleryUrlSchema.nullable(),
  already_signed: z.boolean(),
  packages: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      description: z.string().nullable(),
      price: z.number(),
      duration_hours: z.number(),
    }),
  ),
});

// The copy of the package stored in contracts.package_snapshot by submit_booking.
// The generated types only say "Json", so the shape is checked here instead of being cast.
export const packageSnapshotSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  duration_hours: z.number(),
});
