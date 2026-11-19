import { z } from "zod";

// Link to an external gallery (we do not store photos).
// The raw text must start with "https://" in lower case, exactly like the database
// check (gallery_url ~ '^https://'), so the form and the database agree.
// new URL() then checks that it is a real URL with a host.
export const galleryUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .startsWith("https://")
  .refine((value) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    // A user name or password in the link would be shown to the couple; refuse it.
    return url.hostname !== "" && url.username === "" && url.password === "";
  });

// The "Gallery link" form field. A blank field means "remove the link" and becomes
// null; anything else must pass galleryUrlSchema. A missing field (null) is an error.
export const galleryUrlFieldSchema = z.union([
  z
    .string()
    .trim()
    .length(0)
    .transform(() => null),
  galleryUrlSchema,
]);
