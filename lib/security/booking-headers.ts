// Response headers for the public booking pages (/book/[token]).
// The token is part of the URL path, so these headers keep it from leaking.
export const bookingRoute = {
  // Matches /book/<anything>, including the server action POST to the same path.
  source: "/book/:path*",
  headers: [
    // The browser sends no Referer header when the visitor follows a link away from
    // the page, so the address (with the token) is not handed to other sites.
    { key: "Referrer-Policy", value: "no-referrer" },
    // The page holds the couple's names and chosen package: no browser or proxy cache.
    { key: "Cache-Control", value: "no-store" },
    // Booking links must not show up in search results.
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ],
};
