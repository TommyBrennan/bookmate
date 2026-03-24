import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestRequest, parseResponse } from "../../helpers/mock-request";

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
    compare: vi.fn(),
  },
}));

const { POST } = await import("@/app/api/auth/register/route");

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.userId = undefined;
    mockSession.email = undefined;
    mockSession.displayName = undefined;
    testDb.exec("DELETE FROM users");
  });

  it("registers a new user successfully", async () => {
    const req = createTestRequest("/api/auth/register", {
      method: "POST",
      body: { email: "new@example.com", password: "password123", displayName: "New User" },
    });

    const response = await POST(req);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(201);
    expect(data).toHaveProperty("user");
    expect((data as { user: { email: string } }).user.email).toBe("new@example.com");

    const user = testDb.prepare("SELECT * FROM users WHERE email = ?").get("new@example.com");
    expect(user).toBeTruthy();
    expect(mockSession.save).toHaveBeenCalled();
  });

  it("returns 400 when email is missing", async () => {
    const req = createTestRequest("/api/auth/register", {
      method: "POST",
      body: { password: "password123", displayName: "User" },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const req = createTestRequest("/api/auth/register", {
      method: "POST",
      body: { email: "a@b.com", password: "short", displayName: "User" },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("8 characters");
  });

  it("returns 400 when password exceeds 72 chars", async () => {
    const req = createTestRequest("/api/auth/register", {
      method: "POST",
      body: { email: "a@b.com", password: "a".repeat(73), displayName: "User" },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 409 when email already exists", async () => {
    testDb.prepare("INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)").run(
      "taken@example.com", "$2a$12$hash", "Existing"
    );

    const req = createTestRequest("/api/auth/register", {
      method: "POST",
      body: { email: "taken@example.com", password: "password123", displayName: "Another" },
    });

    const response = await POST(req);
    expect(response.status).toBe(409);
  });

  it("returns 400 when display name is too long", async () => {
    const req = createTestRequest("/api/auth/register", {
      method: "POST",
      body: { email: "a@b.com", password: "password123", displayName: "A".repeat(101) },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when displayName is not a string", async () => {
    const req = createTestRequest("/api/auth/register", {
      method: "POST",
      body: { email: "a@b.com", password: "password123", displayName: 12345 },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("string");
  });

  it("returns 400 when email is not a string", async () => {
    const req = createTestRequest("/api/auth/register", {
      method: "POST",
      body: { email: 123, password: "password123", displayName: "User" },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("trims and lowercases email", async () => {
    const req = createTestRequest("/api/auth/register", {
      method: "POST",
      body: { email: "  User@Example.COM  ", password: "password123", displayName: "User" },
    });

    const response = await POST(req);
    const data = await response.json();
    expect(data.user.email).toBe("user@example.com");
  });
});
