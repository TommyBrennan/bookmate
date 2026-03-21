import { vi, afterEach } from "vitest";

// Suppress console.error in tests (route handlers log errors)
vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  vi.clearAllMocks();
});
