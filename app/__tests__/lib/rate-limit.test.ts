import { describe, it, expect, vi, beforeEach } from "vitest";

// Use fake timers to control the setInterval cleanup and avoid leaks
vi.useFakeTimers();

// Import after fake timers are set up
const { checkRateLimit } = await import("@/lib/rate-limit");

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Advance time so previous entries expire (default window is 15 min)
    vi.advanceTimersByTime(16 * 60 * 1000);
  });

  it("allows requests under the limit", () => {
    const result = checkRateLimit("test:allow", 3, 60000);
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBe(0);
  });

  it("tracks multiple requests and allows up to maxAttempts", () => {
    const key = "test:multi";
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, 5, 60000);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks when limit is exceeded", () => {
    const key = "test:block";
    // Fill up the limit
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 60000);
    }

    // Next request should be blocked
    const result = checkRateLimit(key, 3, 60000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("allows requests again after window expires", () => {
    const key = "test:expire";
    // Fill up the limit
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 60000);
    }

    // Blocked
    expect(checkRateLimit(key, 3, 60000).allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(61000);

    // Allowed again
    expect(checkRateLimit(key, 3, 60000).allowed).toBe(true);
  });

  it("uses separate keys independently", () => {
    // Fill up one key
    for (let i = 0; i < 2; i++) {
      checkRateLimit("user:alice", 2, 60000);
    }
    expect(checkRateLimit("user:alice", 2, 60000).allowed).toBe(false);

    // Different key should still be allowed
    expect(checkRateLimit("user:bob", 2, 60000).allowed).toBe(true);
  });

  it("returns correct retryAfter value", () => {
    const key = "test:retry";
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 60000);
    }

    const result = checkRateLimit(key, 3, 60000);
    expect(result.allowed).toBe(false);
    // retryAfter should be approximately 60 seconds (the window)
    expect(result.retryAfter).toBeLessThanOrEqual(60);
    expect(result.retryAfter).toBeGreaterThan(0);
  });
});
