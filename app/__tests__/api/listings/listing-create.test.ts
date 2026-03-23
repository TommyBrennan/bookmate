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

const mockSession = vi.hoisted(() => ({
  userId: undefined as number | undefined,
  email: undefined as string | undefined,
  displayName: undefined as string | undefined,
  save: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: testDb }));

vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn().mockImplementation(async () => {
    if (!mockSession.userId) return null;
    return mockSession;
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, retryAfter: 0 }),
}));

const { POST } = await import("@/app/api/listings/create/route");

function insertUser(email = "test@example.com", name = "Test User") {
  testDb.prepare("INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)").run(email, "hash", name);
  return testDb.prepare("SELECT last_insert_rowid() as id").get().id as number;
}

const validBody = {
  bookTitle: "The Great Gatsby",
  bookAuthor: "F. Scott Fitzgerald",
  bookCoverUrl: "https://covers.openlibrary.org/b/id/12345-L.jpg",
  bookOlid: "OL12345W",
  language: "English",
  readingPace: "1 chapter per week",
  startDate: "2026-12-01",
  meetingFormat: "text",
  maxGroupSize: "5",
  requiresApproval: false,
  platformPreference: "telegram",
};

describe("POST /api/listings/create", () => {
  let userId: number;

  beforeEach(() => {
    testDb.exec("DELETE FROM listing_members");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");
    userId = insertUser();
    mockSession.userId = userId;
    mockSession.email = "test@example.com";
    mockSession.displayName = "Test User";
  });

  it("returns 401 when not authenticated", async () => {
    mockSession.userId = undefined;

    const req = createTestRequest("/api/listings/create", {
      method: "POST",
      body: validBody,
    });
    const response = await POST(req);
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });

  it("creates a listing successfully", async () => {
    const req = createTestRequest("/api/listings/create", {
      method: "POST",
      body: validBody,
    });
    const response = await POST(req);
    const { status, data } = await parseResponse<{ id: number }>(response);

    expect(status).toBe(201);
    expect(data.id).toBeDefined();

    // Verify listing was created in DB
    const listing = testDb.prepare("SELECT * FROM listings WHERE id = ?").get(data.id) as Record<string, unknown>;
    expect(listing.book_title).toBe("The Great Gatsby");
    expect(listing.book_author).toBe("F. Scott Fitzgerald");
    expect(listing.platform_preference).toBe("telegram");

    // Verify author was auto-joined as member
    const member = testDb.prepare("SELECT * FROM listing_members WHERE listing_id = ? AND user_id = ?").get(data.id, userId);
    expect(member).toBeDefined();
  });

  it("returns 400 when required fields are missing", async () => {
    const req = createTestRequest("/api/listings/create", {
      method: "POST",
      body: { bookTitle: "Test" },
    });
    const response = await POST(req);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("returns 400 when fields exceed maximum length", async () => {
    const req = createTestRequest("/api/listings/create", {
      method: "POST",
      body: { ...validBody, bookTitle: "x".repeat(301) },
    });
    const response = await POST(req);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("exceed maximum length");
  });

  it("returns 400 for invalid meeting format", async () => {
    const req = createTestRequest("/api/listings/create", {
      method: "POST",
      body: { ...validBody, meetingFormat: "invalid" },
    });
    const response = await POST(req);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 for invalid start date format", async () => {
    const req = createTestRequest("/api/listings/create", {
      method: "POST",
      body: { ...validBody, startDate: "12/01/2026" },
    });
    const response = await POST(req);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 for past start date", async () => {
    const req = createTestRequest("/api/listings/create", {
      method: "POST",
      body: { ...validBody, startDate: "2020-01-01" },
    });
    const response = await POST(req);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("past");
  });

  it("returns 400 for invalid group size", async () => {
    const req = createTestRequest("/api/listings/create", {
      method: "POST",
      body: { ...validBody, maxGroupSize: "1" },
    });
    const response = await POST(req);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("between 2 and 20");
  });

  it("sanitizes non-openlibrary book cover URLs", async () => {
    const req = createTestRequest("/api/listings/create", {
      method: "POST",
      body: { ...validBody, bookCoverUrl: "https://evil.com/tracker.jpg" },
    });
    const response = await POST(req);
    const { data } = await parseResponse<{ id: number }>(response);

    const listing = testDb.prepare("SELECT book_cover_url FROM listings WHERE id = ?").get(data.id) as Record<string, string>;
    expect(listing.book_cover_url).toBe("");
  });

  it("defaults platform to telegram for unknown values", async () => {
    const req = createTestRequest("/api/listings/create", {
      method: "POST",
      body: { ...validBody, platformPreference: "unknown" },
    });
    const response = await POST(req);
    const { data } = await parseResponse<{ id: number }>(response);

    const listing = testDb.prepare("SELECT platform_preference FROM listings WHERE id = ?").get(data.id) as Record<string, string>;
    expect(listing.platform_preference).toBe("telegram");
  });

  it("trims whitespace from book title and author", async () => {
    const req = createTestRequest("/api/listings/create", {
      method: "POST",
      body: { ...validBody, bookTitle: "  Spaced Title  ", bookAuthor: "  Spaced Author  " },
    });
    const response = await POST(req);
    const { data } = await parseResponse<{ id: number }>(response);

    const listing = testDb.prepare("SELECT book_title, book_author FROM listings WHERE id = ?").get(data.id) as Record<string, string>;
    expect(listing.book_title).toBe("Spaced Title");
    expect(listing.book_author).toBe("Spaced Author");
  });
});
