import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginRedirectUrl } from "@/lib/auth/login-url";
import { decideAccess } from "@/lib/auth/routes";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Runs before every matched request. Two jobs: refresh the session cookies (the
// access token expires after an hour) and apply the access rules from decideAccess.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
        response = NextResponse.next({ request });
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
  } = await supabase.auth.getUser();

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
