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
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id INTEGER,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (listing_id) REFERENCES listings(id)
    );
  `);
  return db;
});

const mockRequireAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ default: testDb }));

vi.mock("@/lib/session", () => ({
  requireAuth: mockRequireAuth,
}));

const { GET, PATCH } = await import("@/app/api/notifications/route");

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testDb.exec("DELETE FROM notifications");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");

    testDb.prepare(
      "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
    ).run(1, "user@test.com", "hash", "Test User");

    testDb.prepare(
      "INSERT INTO listings (id, author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(1, 1, "Test Book", "Test Author", "1 chapter/week", "2026-04-01", "text", 4);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns empty notifications for new user", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.notifications).toEqual([]);
    expect(data.unreadCount).toBe(0);
  });

  it("returns notifications with unread count", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });

    testDb.prepare(
      "INSERT INTO notifications (user_id, listing_id, type, message, is_read) VALUES (?, ?, ?, ?, ?)"
    ).run(1, 1, "member_joined", "Someone joined your group", 0);
    testDb.prepare(
      "INSERT INTO notifications (user_id, listing_id, type, message, is_read) VALUES (?, ?, ?, ?, ?)"
    ).run(1, 1, "group_full", "Your group is now full", 1);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.notifications).toHaveLength(2);
    expect(data.unreadCount).toBe(1);
  });

  it("includes book_title from listing join", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });

    testDb.prepare(
      "INSERT INTO notifications (user_id, listing_id, type, message) VALUES (?, ?, ?, ?)"
    ).run(1, 1, "member_joined", "Someone joined");

    const response = await GET();
    const data = await response.json();
    expect(data.notifications[0].book_title).toBe("Test Book");
  });
});

describe("PATCH /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testDb.exec("DELETE FROM notifications");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");

    testDb.prepare(
      "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
    ).run(1, "user@test.com", "hash", "Test User");

    testDb.prepare(
      "INSERT INTO listings (id, author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(1, 1, "Test Book", "Test Author", "1 chapter/week", "2026-04-01", "text", 4);

    testDb.prepare(
      "INSERT INTO notifications (id, user_id, listing_id, type, message, is_read) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(1, 1, 1, "member_joined", "Someone joined", 0);
    testDb.prepare(
      "INSERT INTO notifications (id, user_id, listing_id, type, message, is_read) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(2, 1, 1, "group_full", "Group is full", 0);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const req = createTestRequest("/api/notifications", {
      method: "PATCH",
      body: { notificationId: 1 },
    });
    const response = await PATCH(req);
    expect(response.status).toBe(401);
  });

  it("marks a single notification as read", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });

    const req = createTestRequest("/api/notifications", {
      method: "PATCH",
      body: { notificationId: 1 },
    });
    const response = await PATCH(req);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);

    // Verify only one was marked as read
    const unread = testDb.prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = 1 AND is_read = 0"
    ).get() as { count: number };
    expect(unread.count).toBe(1);
  });

  it("marks all notifications as read when no notificationId", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });

    const req = createTestRequest("/api/notifications", {
      method: "PATCH",
      body: {},
    });
    const response = await PATCH(req);
    expect(response.status).toBe(200);

    const unread = testDb.prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = 1 AND is_read = 0"
    ).get() as { count: number };
    expect(unread.count).toBe(0);
  });
});
