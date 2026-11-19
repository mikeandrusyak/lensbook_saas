// A fresh, unpredictable value for every request. It goes into the CSP header and
// onto our scripts; an attacker who cannot guess it cannot get a script to run.
// Web Crypto and btoa (not Buffer) so it also works in the proxy runtime.
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes));
}
