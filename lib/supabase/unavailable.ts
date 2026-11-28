// Decides whether a Supabase error means "the service is down" (for example the
// free-tier project is paused) rather than "this visitor has no valid session".
// Supabase does not say "paused" directly: the request either gets no answer
// (status 0 or missing) or a server error (5xx). Client errors (4xx), such as
// a missing or expired session, are normal and must not trigger the notice.
export function isServiceUnavailable(error: { status?: number } | null): boolean {
  if (error === null) return false;
  if (error.status === undefined || error.status === 0) return true;
  return error.status >= 500;
}

// getUser() makes no network request when there is no session cookie, so for an
// anonymous visitor it cannot tell that Supabase is down. This asks the Auth health
// endpoint directly. fetchFn is a parameter so the tests can pass a fake one.
export async function supabaseIsDown(
  url: string,
  anonKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetchFn(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      // Do not keep the visitor waiting long for a database that does not answer.
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    return isServiceUnavailable({ status: res.status });
  } catch {
    // Network error or timeout: no answer at all.
    return true;
  }
}
