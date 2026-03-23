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
    CREATE TABLE IF NOT EXISTS user_genres (
      user_id INTEGER NOT NULL,
      genre TEXT NOT NULL,
      PRIMARY KEY (user_id, genre),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  return db;
});

const mockSession = vi.hoisted(() => ({
  userId: 1 as number | undefined,
}));

const mockRequireAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ default: testDb }));
vi.mock("@/lib/session", () => ({ requireAuth: mockRequireAuth }));

const { GET, PUT } = await import("@/app/api/profile/genres/route");

describe("/api/profile/genres", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testDb.exec("DELETE FROM user_genres");
    testDb.exec("DELETE FROM users");
    testDb.prepare(
      "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
    ).run(1, "user@test.com", "hash", "Test User");
    mockSession.userId = 1;
  });

  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      mockRequireAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns empty genres and available list for new user", async () => {
      mockRequireAuth.mockResolvedValue(mockSession);
      const res = await GET();
      const { status, data } = await parseResponse<{ genres: string[]; available: string[] }>(res);
      expect(status).toBe(200);
      expect(data.genres).toEqual([]);
      expect(data.available.length).toBeGreaterThan(0);
      expect(data.available).toContain("Science Fiction");
    });

    it("returns saved genres for user", async () => {
      mockRequireAuth.mockResolvedValue(mockSession);
      testDb.prepare("INSERT INTO user_genres (user_id, genre) VALUES (?, ?)").run(1, "Fantasy");
      testDb.prepare("INSERT INTO user_genres (user_id, genre) VALUES (?, ?)").run(1, "Horror");
      const res = await GET();
      const { data } = await parseResponse<{ genres: string[] }>(res);
      expect(data.genres).toContain("Fantasy");
      expect(data.genres).toContain("Horror");
      expect(data.genres.length).toBe(2);
    });
  });

  describe("PUT", () => {
    it("returns 401 when not authenticated", async () => {
      mockRequireAuth.mockResolvedValue(null);
      const req = createTestRequest("/api/profile/genres", {
        method: "PUT",
        body: { genres: ["Fantasy"] },
      });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when genres is not an array", async () => {
      mockRequireAuth.mockResolvedValue(mockSession);
      const req = createTestRequest("/api/profile/genres", {
        method: "PUT",
        body: { genres: "Fantasy" },
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("saves valid genres", async () => {
      mockRequireAuth.mockResolvedValue(mockSession);
      const req = createTestRequest("/api/profile/genres", {
        method: "PUT",
        body: { genres: ["Fantasy", "Science Fiction"] },
      });
      const res = await PUT(req);
      const { status, data } = await parseResponse<{ genres: string[] }>(res);
      expect(status).toBe(200);
      expect(data.genres).toEqual(["Fantasy", "Science Fiction"]);

      // Verify in DB
      const rows = testDb.prepare("SELECT genre FROM user_genres WHERE user_id = 1").all() as { genre: string }[];
      expect(rows.length).toBe(2);
    });

    it("filters out invalid genres", async () => {
      mockRequireAuth.mockResolvedValue(mockSession);
      const req = createTestRequest("/api/profile/genres", {
        method: "PUT",
        body: { genres: ["Fantasy", "Not A Genre", "Horror"] },
      });
      const res = await PUT(req);
      const { data } = await parseResponse<{ genres: string[] }>(res);
      expect(data.genres).toEqual(["Fantasy", "Horror"]);
    });

    it("replaces existing genres", async () => {
      mockRequireAuth.mockResolvedValue(mockSession);
      testDb.prepare("INSERT INTO user_genres (user_id, genre) VALUES (?, ?)").run(1, "Fantasy");
      testDb.prepare("INSERT INTO user_genres (user_id, genre) VALUES (?, ?)").run(1, "Horror");

      const req = createTestRequest("/api/profile/genres", {
        method: "PUT",
        body: { genres: ["Romance"] },
      });
      const res = await PUT(req);
      const { data } = await parseResponse<{ genres: string[] }>(res);
      expect(data.genres).toEqual(["Romance"]);

      const rows = testDb.prepare("SELECT genre FROM user_genres WHERE user_id = 1").all() as { genre: string }[];
      expect(rows.length).toBe(1);
      expect(rows[0].genre).toBe("Romance");
    });
  });
});
