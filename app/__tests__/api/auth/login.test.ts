import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestRequest } from "../../helpers/mock-request";

const testDb = vi.hoisted(() => {
  const Db = require("better-sqlite3");
  const db = new Db(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      bio TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
});

const mockSession = vi.hoisted(() => ({
  userId: undefined as number | undefined,
  email: undefined as string | undefined,
  displayName: undefined as string | undefined,
  save: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn(),
}));

const mockBcryptCompare = vi.hoisted(() => vi.fn().mockResolvedValue(false));

vi.mock("@/lib/db", () => ({ default: testDb }));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue(mockSession),
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, retryAfter: 0 }),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$mockedhash"),
    compare: mockBcryptCompare,
  },
}));

const { POST } = await import("@/app/api/auth/login/route");

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.userId = undefined;
    mockSession.email = undefined;
    mockSession.displayName = undefined;
    mockBcryptCompare.mockResolvedValue(false);

    testDb.exec("DELETE FROM users");
    testDb.prepare("INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)").run(
      "test@example.com", "$2a$12$realhash", "Test User"
    );
  });

  it("logs in successfully with correct credentials", async () => {
    mockBcryptCompare.mockResolvedValue(true);

    const req = createTestRequest("/api/auth/login", {
      method: "POST",
      body: { email: "test@example.com", password: "password123" },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user.email).toBe("test@example.com");
    expect(mockSession.save).toHaveBeenCalled();
  });

  it("returns 400 when email is missing", async () => {
    const req = createTestRequest("/api/auth/login", {
      method: "POST",
      body: { password: "password123" },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 401 for non-existent email", async () => {
    const req = createTestRequest("/api/auth/login", {
      method: "POST",
      body: { email: "nobody@example.com", password: "password123" },
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("returns 401 for wrong password", async () => {
    mockBcryptCompare.mockResolvedValue(false);

    const req = createTestRequest("/api/auth/login", {
      method: "POST",
      body: { email: "test@example.com", password: "wrongpassword" },
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("handles case-insensitive email lookup", async () => {
    mockBcryptCompare.mockResolvedValue(true);

    const req = createTestRequest("/api/auth/login", {
      method: "POST",
      body: { email: "TEST@EXAMPLE.COM", password: "password123" },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
  });
});
