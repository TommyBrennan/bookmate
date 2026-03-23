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

const mockTelegram = vi.hoisted(() => ({
  isBotConfigured: vi.fn().mockReturnValue(true),
  generateGroupDeepLink: vi.fn().mockResolvedValue("https://t.me/BookmateBot?startgroup=listing_1"),
}));

vi.mock("@/lib/db", () => ({ default: testDb }));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue(mockSession),
  requireAuth: vi.fn().mockImplementation(async () => {
    if (!mockSession.userId) return null;
    return mockSession;
  }),
}));

vi.mock("@/lib/telegram", () => mockTelegram);

const { GET } = await import("@/app/api/listings/[id]/auto-telegram/route");

function insertUser(email = "test@example.com", name = "Test User") {
  testDb
    .prepare("INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)")
    .run(email, "hash", name);
  return testDb.prepare("SELECT last_insert_rowid() as id").get().id as number;
}

function insertListing(
  authorId: number,
  overrides: Partial<{
    is_full: number;
    telegram_link: string;
  }> = {}
) {
  testDb
    .prepare(
      `INSERT INTO listings (author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full, telegram_link)
       VALUES (?, 'Test Book', 'Test Author', '1ch/wk', '2026-04-01', 'text', 5, ?, ?)`
    )
    .run(authorId, overrides.is_full ?? 0, overrides.telegram_link ?? "");
  return testDb.prepare("SELECT last_insert_rowid() as id").get().id as number;
}

describe("GET /api/listings/[id]/auto-telegram", () => {
  beforeEach(() => {
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");
    mockSession.userId = undefined;
    mockTelegram.isBotConfigured.mockReturnValue(true);
    mockTelegram.generateGroupDeepLink.mockResolvedValue("https://t.me/BookmateBot?startgroup=listing_1");
  });

  it("returns 401 when not authenticated", async () => {
    const req = createTestRequest("http://localhost:3000/api/listings/1/auto-telegram");
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 404 when bot is not configured", async () => {
    const userId = insertUser();
    mockSession.userId = userId;
    mockTelegram.isBotConfigured.mockReturnValue(false);
    const req = createTestRequest("http://localhost:3000/api/listings/1/auto-telegram");
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    const { status, data } = await parseResponse(res);
    expect(status).toBe(404);
    expect(data).toHaveProperty("botConfigured", false);
  });

  it("returns 400 for invalid listing ID", async () => {
    const userId = insertUser();
    mockSession.userId = userId;
    const req = createTestRequest("http://localhost:3000/api/listings/abc/auto-telegram");
    const res = await GET(req, { params: Promise.resolve({ id: "abc" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 404 when listing not found", async () => {
    const userId = insertUser();
    mockSession.userId = userId;
    const req = createTestRequest("http://localhost:3000/api/listings/999/auto-telegram");
    const res = await GET(req, { params: Promise.resolve({ id: "999" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns 403 when user is not the author", async () => {
    const authorId = insertUser("author@test.com", "Author");
    const otherId = insertUser("other@test.com", "Other");
    const listingId = insertListing(authorId, { is_full: 1 });
    mockSession.userId = otherId;
    const req = createTestRequest(`http://localhost:3000/api/listings/${listingId}/auto-telegram`);
    const res = await GET(req, { params: Promise.resolve({ id: String(listingId) }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 400 when group is not full", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 0 });
    mockSession.userId = userId;
    const req = createTestRequest(`http://localhost:3000/api/listings/${listingId}/auto-telegram`);
    const res = await GET(req, { params: Promise.resolve({ id: String(listingId) }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 when telegram link already set", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1, telegram_link: "https://t.me/existing" });
    mockSession.userId = userId;
    const req = createTestRequest(`http://localhost:3000/api/listings/${listingId}/auto-telegram`);
    const res = await GET(req, { params: Promise.resolve({ id: String(listingId) }) });
    const { status, data } = await parseResponse(res);
    expect(status).toBe(400);
    expect(data).toHaveProperty("telegramLink", "https://t.me/existing");
  });

  it("returns deep link on success", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1 });
    mockSession.userId = userId;
    mockTelegram.generateGroupDeepLink.mockResolvedValue(`https://t.me/BookmateBot?startgroup=listing_${listingId}`);
    const req = createTestRequest(`http://localhost:3000/api/listings/${listingId}/auto-telegram`);
    const res = await GET(req, { params: Promise.resolve({ id: String(listingId) }) });
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data).toHaveProperty("deepLink");
    expect(data).toHaveProperty("instructions");
  });

  it("returns 500 when deep link generation fails", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1 });
    mockSession.userId = userId;
    mockTelegram.generateGroupDeepLink.mockResolvedValue(null);
    const req = createTestRequest(`http://localhost:3000/api/listings/${listingId}/auto-telegram`);
    const res = await GET(req, { params: Promise.resolve({ id: String(listingId) }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });
});
