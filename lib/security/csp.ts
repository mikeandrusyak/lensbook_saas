// Enforced: the browser blocks whatever the policy does not allow. It ran as
// "Content-Security-Policy-Report-Only" first (step 8.3b); the production build showed no violations.
export const CSP_HEADER = "Content-Security-Policy";

// Builds the Content-Security-Policy header value for one request.
// The nonce is a random value made per request (in proxy.ts): only scripts that carry
// it may run, so a script injected through a name or a location stays blocked.
// allowHttp: only for a production build opened over plain http (local demo, e.g. the VM
// address). Never set it on a real host: it switches off the upgrade to https.
export function buildCsp(nonce: string, isDev: boolean, allowHttp = false): string {
  const directives = [
    // Anything not listed below may only come from the app itself.
    "default-src 'self'",
    // 'strict-dynamic': scripts loaded by a trusted (nonce) script are trusted too,
    // which Next.js needs for its chunks. React uses eval for debugging in dev only.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    // style="..." attributes cannot carry a nonce, yet React and Next.js set them.
    // An attribute cannot run code, so only attributes (not <style> tags) are opened.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // No plugins, no <base> tag pointing elsewhere, forms post only to the app itself.
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // No other site may show the app in a frame (clickjacking).
    "frame-ancestors 'none'",
  ];
  // Dev runs on plain http (localhost or the VM address), so the upgrade is production only.
  if (!isDev && !allowHttp) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
