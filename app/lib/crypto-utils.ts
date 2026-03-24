import { timingSafeEqual } from "crypto";

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 * Use this for comparing secrets (webhook tokens, setup secrets, etc.)
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Do a dummy comparison to add some constant work, though this does not
    // fully mask length differences (bufA self-compare time varies with length).
    // In practice, the secrets compared here are fixed-length env vars.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Escape user-controlled content for safe embedding in HTML emails.
 */
export function escapeHtmlForEmail(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
