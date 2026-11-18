export type Access = "allow" | "to-login" | "to-dashboard";

// Default deny: every path needs a login unless it is listed here. A new page is
// protected automatically, and forgetting to list it fails safe.
const PUBLIC_EXACT = ["/"];
// Only for visitors without a session: a logged-in user is sent to the dashboard.
const AUTH_PAGES = ["/login", "/signup"];
// Booking links are opened by clients, who have no account (token in the path).
const PUBLIC_PREFIXES = ["/book/"];

export function decideAccess(pathname: string, isLoggedIn: boolean): Access {
  // "/login/" and "/login" are the same page
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (AUTH_PAGES.includes(path)) return isLoggedIn ? "to-dashboard" : "allow";
  if (PUBLIC_EXACT.includes(path)) return "allow";
  // The prefix ends with "/", so "/booking" and "/book" do not match.
  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return "allow";
  return isLoggedIn ? "allow" : "to-login";
}
