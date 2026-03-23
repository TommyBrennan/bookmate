import { describe, it, expect, vi, beforeEach } from "vitest";

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
    CREATE TABLE IF NOT EXISTS listing_members (
      listing_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (listing_id, user_id),
      FOREIGN KEY (listing_id) REFERENCES listings(id),
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

const { GET } = await import("@/app/api/profile/reading/route");

interface ReadingResponse {
  active: Array<{ id: number; book_title: string }>;
  history: Array<{ id: number; book_title: string }>;
  upcoming: Array<{ id: number; book_title: string }>;
  total: number;
}

function seedListing(authorId: number, overrides: Record<string, unknown> = {}) {
  const result = testDb.prepare(
    `INSERT INTO listings (author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    authorId,
    overrides.book_title ?? "Test Book",
    overrides.book_author ?? "Test Author",
    overrides.reading_pace ?? "1 chapter/week",
    overrides.start_date ?? "2026-04-01",
    overrides.meeting_format ?? "text",
    overrides.max_group_size ?? 5,
    overrides.is_full ?? 0
  );
  return Number(result.lastInsertRowid);
}

function joinListing(listingId: number, userId: number) {
  testDb.prepare(
    "INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)"
  ).run(listingId, userId);
}

describe("GET /api/profile/reading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testDb.exec("DELETE FROM listing_members");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");
    testDb.prepare(
      "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
    ).run(1, "user@test.com", "hash", "Test User");
    mockSession.userId = 1;
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns empty arrays for user with no groups", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);
    const res = await GET();
    const data = await res.json() as ReadingResponse;
    expect(res.status).toBe(200);
    expect(data.active).toEqual([]);
    expect(data.history).toEqual([]);
    expect(data.upcoming).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("categorizes upcoming listings correctly", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);
    const listingId = seedListing(1, {
      book_title: "Future Book",
      start_date: "2027-06-01",
      is_full: 0,
    });
    joinListing(listingId, 1);

    const res = await GET();
    const data = await res.json() as ReadingResponse;
    expect(data.upcoming.length).toBe(1);
    expect(data.upcoming[0].book_title).toBe("Future Book");
    expect(data.history.length).toBe(0);
    expect(data.active.length).toBe(0);
    expect(data.total).toBe(1);
  });

  it("categorizes history listings correctly (full + past start)", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);
    const listingId = seedListing(1, {
      book_title: "Old Book",
      start_date: "2025-01-01",
      is_full: 1,
    });
    joinListing(listingId, 1);

    const res = await GET();
    const data = await res.json() as ReadingResponse;
    expect(data.history.length).toBe(1);
    expect(data.history[0].book_title).toBe("Old Book");
    expect(data.upcoming.length).toBe(0);
  });

  it("categorizes active listings correctly (full + future start)", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);
    const listingId = seedListing(1, {
      book_title: "Active Book",
      start_date: "2027-06-01",
      is_full: 1,
    });
    joinListing(listingId, 1);

    const res = await GET();
    const data = await res.json() as ReadingResponse;
    expect(data.active.length).toBe(1);
    expect(data.active[0].book_title).toBe("Active Book");
  });

  it("returns total count across all categories", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);

    const l1 = seedListing(1, { book_title: "Book A", start_date: "2025-01-01", is_full: 1 });
    const l2 = seedListing(1, { book_title: "Book B", start_date: "2027-06-01", is_full: 0 });
    const l3 = seedListing(1, { book_title: "Book C", start_date: "2027-06-01", is_full: 1 });
    joinListing(l1, 1);
    joinListing(l2, 1);
    joinListing(l3, 1);

    const res = await GET();
    const data = await res.json() as ReadingResponse;
    expect(data.total).toBe(3);
    expect(data.history.length).toBe(1);
    expect(data.upcoming.length).toBe(1);
    expect(data.active.length).toBe(1);
  });
});
