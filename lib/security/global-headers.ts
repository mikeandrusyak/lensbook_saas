// Response headers for every route of the app.
// Listed before bookingRoute in next.config.ts, so /book/* keeps its stricter values.
export const globalRoute = {
  source: "/:path*",
  headers: [
    // The browser must trust the declared Content-Type and not guess (and run) a file as a script.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // No other site may show the app in a frame (clickjacking). The CSP
    // `frame-ancestors` directive does the same and is added in step 8.3.
    { key: "X-Frame-Options", value: "DENY" },
    // Other sites get only the origin, not the path.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  ],
};
