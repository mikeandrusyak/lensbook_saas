// Where to send a visitor without a session. The path they wanted goes into ?next=
// so login can bring them back. Only the pathname is kept, never the query string.
// "/" and the auth pages get a plain /login: there is nothing worth returning to,
// and /login?next=/login would loop.
export function loginRedirectUrl(pathname: string): string {
  if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
    return "/login";
  }
  return `/login?next=${encodeURIComponent(pathname)}`;
}
