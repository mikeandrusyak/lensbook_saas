import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

// Client for Client Components (runs in the browser, uses the anon key only).
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
