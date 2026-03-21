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
  userId: 1 as number | undefined,
  displayName: "Test User" as string | undefined,
  save: vi.fn().mockResolvedValue(undefined),
}));

const mockRequireAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ default: testDb }));

vi.mock("@/lib/session", () => ({
  requireAuth: mockRequireAuth,
}));

const { PATCH } = await import("@/app/api/profile/route");

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testDb.exec("DELETE FROM users");

    testDb.prepare(
      "INSERT INTO users (id, email, password_hash, display_name, bio) VALUES (?, ?, ?, ?, ?)"
    ).run(1, "user@test.com", "hash", "Test User", "Old bio");

    mockSession.userId = 1;
    mockSession.displayName = "Test User";
    mockSession.save.mockResolvedValue(undefined);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const req = createTestRequest("/api/profile", {
      method: "PATCH",
      body: { displayName: "New Name" },
    });
    const response = await PATCH(req);
    expect(response.status).toBe(401);
  });

  it("updates display name and bio", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);

    const req = createTestRequest("/api/profile", {
      method: "PATCH",
      body: { displayName: "New Name", bio: "New bio" },
    });
    const response = await PATCH(req);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);

    const user = testDb.prepare("SELECT display_name, bio FROM users WHERE id = 1").get() as { display_name: string; bio: string };
    expect(user.display_name).toBe("New Name");
    expect(user.bio).toBe("New bio");
  });

  it("returns 400 when display name is empty", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);

    const req = createTestRequest("/api/profile", {
      method: "PATCH",
      body: { displayName: "", bio: "Some bio" },
    });
    const response = await PATCH(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when display name is too long", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);

    const req = createTestRequest("/api/profile", {
      method: "PATCH",
      body: { displayName: "x".repeat(101), bio: "Some bio" },
    });
    const response = await PATCH(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when bio is too long", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);

    const req = createTestRequest("/api/profile", {
      method: "PATCH",
      body: { displayName: "Valid Name", bio: "x".repeat(501) },
    });
    const response = await PATCH(req);
    expect(response.status).toBe(400);
  });

  it("trims whitespace from display name", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);

    const req = createTestRequest("/api/profile", {
      method: "PATCH",
      body: { displayName: "  Trimmed Name  ", bio: "" },
    });
    const response = await PATCH(req);
    expect(response.status).toBe(200);

    const user = testDb.prepare("SELECT display_name FROM users WHERE id = 1").get() as { display_name: string };
    expect(user.display_name).toBe("Trimmed Name");
  });

  it("updates session displayName after save", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);

    const req = createTestRequest("/api/profile", {
      method: "PATCH",
      body: { displayName: "Updated Name", bio: "" },
    });
    await PATCH(req);
    expect(mockSession.displayName).toBe("Updated Name");
    expect(mockSession.save).toHaveBeenCalled();
  });
});
