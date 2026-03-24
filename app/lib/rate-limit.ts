/**
 * Simple in-memory rate limiter for auth endpoints.
 * Uses a sliding window approach keyed by identifier (IP + route).
 * Not shared across cluster workers — acceptable for SQLite single-process setup.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
// Guard against multiple intervals on Next.js hot reload
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const globalObj = globalThis as unknown as { __rateLimitCleanup?: ReturnType<typeof setInterval> };
if (!globalObj.__rateLimitCleanup) {
  globalObj.__rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < 15 * 60 * 1000);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Check if a request should be rate limited.
 * @param key - Unique identifier (e.g., IP + email for login, IP for register)
 * @param maxAttempts - Maximum attempts allowed in the window
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns Object with allowed boolean and retryAfter seconds (0 if allowed)
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    // Prevent unbounded memory growth under attack
    if (store.size > 50_000) {
      return { allowed: false, retryAfter: 60 };
    }
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxAttempts) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.timestamps.push(now);
  return { allowed: true, retryAfter: 0 };
}
