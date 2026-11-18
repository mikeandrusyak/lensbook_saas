import { createHash, randomBytes } from "node:crypto";

// Server only (node:crypto). The token itself is never stored: the database keeps
// only its SHA-256 hash, so a leaked database does not give out working links.

// 32 random bytes from the operating system's secure random generator, written as
// base64url (letters, digits, "-" and "_"), so it is safe inside a URL path.
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

// SHA-256 of the token text. Postgres computes the same hash later in get_booking
// (digest(token, 'sha256')), so the two sides match.
export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

// PostgREST reads a bytea value as the text "\x" followed by hex digits.
export function hashToPostgres(hash: Buffer): string {
  return `\\x${hash.toString("hex")}`;
}
