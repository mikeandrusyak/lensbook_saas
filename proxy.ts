import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginRedirectUrl } from "@/lib/auth/login-url";
import { decideAccess } from "@/lib/auth/routes";
import { buildCsp, CSP_HEADER } from "@/lib/security/csp";
import { generateNonce } from "@/lib/security/nonce";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { isServiceUnavailable, supabaseIsDown } from "@/lib/supabase/unavailable";

const UNAVAILABLE_PATH = "/unavailable";

// Runs before every matched request. Two jobs: refresh the session cookies (the
// access token expires after an hour) and apply the access rules from decideAccess.
export async function proxy(request: NextRequest) {
  // One nonce per request. It goes on the request, so Next.js puts it on its own
  // scripts, and on the response, so the browser enforces the policy.
  const csp = buildCsp(
    generateNonce(),
    process.env.NODE_ENV === "development",
    // Local demo of a production build over http: start with CSP_ALLOW_HTTP=1.
    process.env.CSP_ALLOW_HTTP === "1",
  );
  request.headers.set(CSP_HEADER, csp);
  const withCsp = (res: NextResponse) => {
    res.headers.set(CSP_HEADER, csp);
    return res;
  };

  let response = withCsp(NextResponse.next({ request }));

  // The notice page needs no session, and asking Supabase here would be pointless
  // while it is down.
  if (request.nextUrl.pathname === UNAVAILABLE_PATH) return response;

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // A refreshed token must reach both the rest of this request (request
        // cookies) and the browser (response cookies).
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = withCsp(NextResponse.next({ request }));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Cache headers keep a CDN from serving one user's cookies to another.
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // getUser() verifies the token with the Auth server; getSession() would trust the cookie.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Supabase did not answer (e.g. the project is paused): show the notice instead of
  // treating the visitor as logged out. A rewrite keeps the address in the browser,
  // so a reload opens the real page once the database is active again.
  // Without a session cookie getUser() asks nobody, so check the health endpoint then.
  const down =
    isServiceUnavailable(error) ||
    (user === null && (await supabaseIsDown(url, anonKey)));
  if (down) {
    return withCsp(
      NextResponse.rewrite(new URL(UNAVAILABLE_PATH, request.url), {
        request,
        status: 503,
      }),
    );
  }

  const access = decideAccess(request.nextUrl.pathname, user !== null);
  if (access === "allow") return response;

  const target =
    access === "to-login"
      ? new URL(loginRedirectUrl(request.nextUrl.pathname), request.url)
      : new URL("/dashboard", request.url);
  const redirect = NextResponse.redirect(target);
  // Keep any cookies refreshed above, otherwise the session would be lost on redirect.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Everything except static files and images, which need no login.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
