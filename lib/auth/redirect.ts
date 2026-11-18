const FALLBACK = "/dashboard";

// Decides where to go after login. The value comes from the URL (?next=), so it is
// untrusted: only a path on this site is allowed, never another host (open redirect).
export function safeRedirectPath(next: unknown): string {
  if (typeof next !== "string") return FALLBACK;
  // Must start with exactly one "/": "//host" is a protocol-relative URL.
  if (!next.startsWith("/") || next.startsWith("//")) return FALLBACK;
  // Browsers treat "\" like "/" and strip tabs and line breaks, so "/\host" or
  // "/<tab>/host" would also leave the site.
  if (/[\\\u0000-\u001f]/.test(next)) return FALLBACK;
  return next;
}
