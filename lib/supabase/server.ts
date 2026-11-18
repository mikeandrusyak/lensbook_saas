import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Client for Server Components, server actions and route handlers.
// The session lives in cookies; every request runs as the logged-in user, so RLS applies.
export async function createClient() {
  // cookies() first: it marks the page as dynamic, so `next build` skips it instead
  // of prerendering it, and the build does not need the Supabase variables.
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies. This is fine: the proxy
          // (step 3.6) refreshes the session and writes the cookies instead.
        }
      },
    },
  });
}
