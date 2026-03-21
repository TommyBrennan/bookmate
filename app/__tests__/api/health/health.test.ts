import { describe, it, expect, vi } from "vitest";
import { parseResponse } from "../../helpers/mock-request";

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
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      book_title TEXT NOT NULL,
      book_author TEXT NOT NULL,
      book_cover_url TEXT DEFAULT '',
      book_olid TEXT DEFAULT '',
      language TEXT DEFAULT 'English',
      reading_pace TEXT NOT NULL,
      start_date TEXT NOT NULL,
      meeting_format TEXT NOT NULL CHECK(meeting_format IN ('voice', 'text', 'mixed')),
      max_group_size INTEGER NOT NULL CHECK(max_group_size >= 2 AND max_group_size <= 20),
      telegram_link TEXT DEFAULT '',
      is_full INTEGER DEFAULT 0,
      requires_approval INTEGER DEFAULT 0,
      platform_preference TEXT DEFAULT 'telegram',
      discord_link TEXT DEFAULT '',
      discord_channel_id TEXT DEFAULT '',
      telegram_chat_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id)
    );
  `);
  return db;
});

const mockSession = vi.hoisted(() => ({
  userId: null as number | null,
}));

vi.mock("@/lib/db", () => ({ default: testDb }));
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(() => Promise.resolve({ userId: mockSession.userId })),
}));

const { GET } = await import("@/app/api/health/route");

describe("GET /api/health", () => {
  it("returns healthy status without stats when unauthenticated", async () => {
    mockSession.userId = null;
    const response = await GET();
    const { status, data } = await parseResponse<{
      status: string;
      database: string;
      stats?: unknown;
    }>(response);

    expect(status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.database).toBe("connected");
    expect(data.stats).toBeUndefined();
  });

  it("returns stats when authenticated", async () => {
    mockSession.userId = 1;
    const response = await GET();
    const { data } = await parseResponse<{
      stats: { users: number; listings: number; openListings: number };
    }>(response);

    expect(data.stats).toBeDefined();
    expect(data.stats.users).toBeGreaterThanOrEqual(0);
  });

  it("reports correct stats", async () => {
    mockSession.userId = 1;
    // Clean up from previous tests
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");

    testDb.prepare("INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)").run(
      "test@test.com", "hash", "Test"
    );
    const userId = (testDb.prepare("SELECT last_insert_rowid() as id").get() as { id: number }).id;
    testDb.prepare(
      "INSERT INTO listings (author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(userId, "Book 1", "Author", "1ch/wk", "2026-04-01", "text", 5, 0);
    testDb.prepare(
      "INSERT INTO listings (author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(userId, "Book 2", "Author", "1ch/wk", "2026-04-01", "text", 5, 1);

    const response = await GET();
    const { data } = await parseResponse<{ stats: { users: number; listings: number; openListings: number } }>(response);

    expect(data.stats.users).toBe(1);
    expect(data.stats.listings).toBe(2);
    expect(data.stats.openListings).toBe(1);
  });

  it("includes timestamp and uptime", async () => {
    const response = await GET();
    const { data } = await parseResponse<{ timestamp: string; uptime: number }>(response);

    expect(data.timestamp).toBeDefined();
    expect(typeof data.uptime).toBe("number");
    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });
});
