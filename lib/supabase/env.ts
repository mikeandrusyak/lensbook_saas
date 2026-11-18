// Reads the public Supabase settings: project URL and anon key only (no service_role).

type RawEnv = { url: string | undefined; anonKey: string | undefined };

// Next.js replaces process.env.NEXT_PUBLIC_* in the browser bundle only when the
// name is written out in full, so each variable is read by its literal name here.
const fromProcessEnv = (): RawEnv => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

// Error messages name the variable but never contain its value.
export function getSupabaseEnv({ url, anonKey }: RawEnv = fromProcessEnv()) {
  if (!url) {
    throw new Error("Missing environment variable NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!anonKey) {
    throw new Error("Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!url.startsWith("https://")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must start with https://");
  }
  return { url, anonKey };
}
