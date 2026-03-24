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

vi.mock("@/lib/db", () => ({ default: testDb }));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  requireAuth: vi.fn(),
}));

const { GET } = await import("@/app/api/listings/route");

function insertUser(email = "test@example.com", name = "Test User") {
  testDb.prepare("INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)").run(email, "hash", name);
  return testDb.prepare("SELECT last_insert_rowid() as id").get().id as number;
}

function insertListing(
  authorId: number,
  overrides: Partial<{
    book_title: string;
    book_author: string;
    meeting_format: string;
    is_full: number;
  }> = {}
) {
  testDb.prepare(
    `INSERT INTO listings (author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    authorId,
    overrides.book_title ?? "Test Book",
    overrides.book_author ?? "Test Author",
    "1ch/wk",
    "2026-04-01",
    overrides.meeting_format ?? "text",
    5,
    overrides.is_full ?? 0
  );
  return testDb.prepare("SELECT last_insert_rowid() as id").get().id as number;
}

describe("GET /api/listings", () => {
  let userId: number;

  beforeEach(() => {
    testDb.exec("DELETE FROM listing_members");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");
    userId = insertUser();
  });

  it("returns empty array when no listings exist", async () => {
    const req = createTestRequest("/api/listings");
    const response = await GET(req);
    const { status, data } = await parseResponse<{ listings: unknown[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(response);

    expect(status).toBe(200);
    expect(data.listings).toEqual([]);
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it("returns open listings only (hides full listings)", async () => {
    insertListing(userId, { book_title: "Open Book" });
    insertListing(userId, { book_title: "Full Book", is_full: 1 });

    const req = createTestRequest("/api/listings");
    const response = await GET(req);
    const { data } = await parseResponse<{ listings: { book_title: string }[] }>(response);

    expect(data.listings.length).toBe(1);
    expect(data.listings[0].book_title).toBe("Open Book");
  });

  it("includes member count in response", async () => {
    const listingId = insertListing(userId);
    testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(listingId, userId);

    const user2 = insertUser("user2@example.com", "User 2");
    testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(listingId, user2);

    const req = createTestRequest("/api/listings");
    const response = await GET(req);
    const { data } = await parseResponse<{ listings: { member_count: number }[] }>(response);

    expect(data.listings[0].member_count).toBe(2);
  });

  // Route uses "q" param for search, not "search"
  it("supports search by book title via q param", async () => {
    insertListing(userId, { book_title: "The Great Gatsby" });
    insertListing(userId, { book_title: "1984" });

    const req = createTestRequest("/api/listings?q=gatsby");
    const response = await GET(req);
    const { data } = await parseResponse<{ listings: { book_title: string }[] }>(response);

    expect(data.listings.length).toBe(1);
    expect(data.listings[0].book_title).toBe("The Great Gatsby");
  });

  it("supports search by book author via q param", async () => {
    insertListing(userId, { book_title: "Book A", book_author: "Tolkien" });
    insertListing(userId, { book_title: "Book B", book_author: "Rowling" });

    const req = createTestRequest("/api/listings?q=tolkien");
    const response = await GET(req);
    const { data } = await parseResponse<{ listings: { book_author: string }[] }>(response);

    expect(data.listings.length).toBe(1);
    expect(data.listings[0].book_author).toBe("Tolkien");
  });

  it("supports filtering by meeting_format", async () => {
    insertListing(userId, { meeting_format: "voice" });
    insertListing(userId, { meeting_format: "text" });

    const req = createTestRequest("/api/listings?meeting_format=voice");
    const response = await GET(req);
    const { data } = await parseResponse<{ listings: unknown[] }>(response);

    expect(data.listings.length).toBe(1);
  });

  it("does not expose telegram_link or discord_link in listing list", async () => {
    const listingId = insertListing(userId);
    testDb.prepare("UPDATE listings SET telegram_link = ?, discord_link = ? WHERE id = ?").run(
      "https://t.me/secret", "https://discord.gg/secret", listingId
    );

    const req = createTestRequest("/api/listings");
    const response = await GET(req);
    const { data } = await parseResponse<{ listings: Record<string, unknown>[] }>(response);

    expect(data.listings.length).toBe(1);
    expect(data.listings[0]).not.toHaveProperty("telegram_link");
    expect(data.listings[0]).not.toHaveProperty("discord_link");
    expect(data.listings[0]).not.toHaveProperty("telegram_chat_id");
    expect(data.listings[0]).not.toHaveProperty("discord_channel_id");
  });

  it("returns listings sorted newest first by default (by id descending)", async () => {
    const id1 = insertListing(userId, { book_title: "First" });
    const id2 = insertListing(userId, { book_title: "Second" });

    // Manually set different created_at timestamps to ensure sort order
    testDb.prepare("UPDATE listings SET created_at = ? WHERE id = ?").run("2026-03-01 00:00:00", id1);
    testDb.prepare("UPDATE listings SET created_at = ? WHERE id = ?").run("2026-03-02 00:00:00", id2);

    const req = createTestRequest("/api/listings");
    const response = await GET(req);
    const { data } = await parseResponse<{ listings: { book_title: string }[] }>(response);

    expect(data.listings[0].book_title).toBe("Second");
    expect(data.listings[1].book_title).toBe("First");
  });
});
