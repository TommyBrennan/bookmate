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
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id INTEGER,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS listing_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      applied_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  return db;
});

const mockSession = vi.hoisted(() => ({
  userId: undefined as number | undefined,
  email: undefined as string | undefined,
  displayName: "Test User" as string | undefined,
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

vi.mock("@/lib/notifications", () => ({
  notifyListingAuthor: vi.fn(),
  notifyGroupFull: vi.fn(),
}));

const { POST } = await import("@/app/api/listings/[id]/join/route");

function insertUser(email = "test@example.com", name = "Test User") {
  testDb.prepare("INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)").run(email, "hash", name);
  return testDb.prepare("SELECT last_insert_rowid() as id").get().id as number;
}

function insertListing(
  authorId: number,
  overrides: Partial<{
    max_group_size: number;
    is_full: number;
    requires_approval: number;
  }> = {}
) {
  testDb.prepare(
    `INSERT INTO listings (author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full, requires_approval)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    authorId,
    "Test Book",
    "Test Author",
    "1ch/wk",
    "2026-04-01",
    "text",
    overrides.max_group_size ?? 5,
    overrides.is_full ?? 0,
    overrides.requires_approval ?? 0
  );
  return testDb.prepare("SELECT last_insert_rowid() as id").get().id as number;
}

function addMember(listingId: number, userId: number) {
  testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(listingId, userId);
}

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/listings/[id]/join", () => {
  let authorId: number;
  let joinerId: number;

  beforeEach(() => {
    testDb.exec("DELETE FROM listing_applications");
    testDb.exec("DELETE FROM notifications");
    testDb.exec("DELETE FROM listing_members");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");
    authorId = insertUser("author@example.com", "Author");
    joinerId = insertUser("joiner@example.com", "Joiner");
    mockSession.userId = joinerId;
    mockSession.displayName = "Joiner";
  });

  it("returns 401 when not authenticated", async () => {
    mockSession.userId = undefined;
    const listingId = insertListing(authorId);

    const req = createTestRequest(`/api/listings/${listingId}/join`, { method: "POST" });
    const response = await POST(req, createParams(String(listingId)));
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });

  it("returns 400 for invalid listing ID", async () => {
    const req = createTestRequest("/api/listings/abc/join", { method: "POST" });
    const response = await POST(req, createParams("abc"));
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 404 for non-existent listing", async () => {
    const req = createTestRequest("/api/listings/999/join", { method: "POST" });
    const response = await POST(req, createParams("999"));
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });

  it("returns 400 when author tries to join own listing", async () => {
    const listingId = insertListing(authorId);
    mockSession.userId = authorId;

    const req = createTestRequest(`/api/listings/${listingId}/join`, { method: "POST" });
    const response = await POST(req, createParams(String(listingId)));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("organizer");
  });

  it("returns 400 when listing requires approval", async () => {
    const listingId = insertListing(authorId, { requires_approval: 1 });

    const req = createTestRequest(`/api/listings/${listingId}/join`, { method: "POST" });
    const response = await POST(req, createParams(String(listingId)));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("approval");
  });

  it("returns 400 when listing is already full", async () => {
    const listingId = insertListing(authorId, { is_full: 1 });

    const req = createTestRequest(`/api/listings/${listingId}/join`, { method: "POST" });
    const response = await POST(req, createParams(String(listingId)));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("full");
  });

  it("returns 400 when already a member", async () => {
    const listingId = insertListing(authorId);
    addMember(listingId, joinerId);

    const req = createTestRequest(`/api/listings/${listingId}/join`, { method: "POST" });
    const response = await POST(req, createParams(String(listingId)));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("already a member");
  });

  it("joins successfully and returns member count", async () => {
    const listingId = insertListing(authorId);
    addMember(listingId, authorId);

    const req = createTestRequest(`/api/listings/${listingId}/join`, { method: "POST" });
    const response = await POST(req, createParams(String(listingId)));
    const { status, data } = await parseResponse<{ ok: boolean; memberCount: number }>(response);

    expect(status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.memberCount).toBe(2);

    // Verify member was added in DB
    const member = testDb.prepare("SELECT * FROM listing_members WHERE listing_id = ? AND user_id = ?").get(listingId, joinerId);
    expect(member).toBeDefined();
  });

  it("marks listing as full when max group size reached", async () => {
    const listingId = insertListing(authorId, { max_group_size: 2 });
    addMember(listingId, authorId);

    const req = createTestRequest(`/api/listings/${listingId}/join`, { method: "POST" });
    const response = await POST(req, createParams(String(listingId)));
    const { data } = await parseResponse<{ ok: boolean; memberCount: number }>(response);

    expect(data.memberCount).toBe(2);

    const listing = testDb.prepare("SELECT is_full FROM listings WHERE id = ?").get(listingId) as Record<string, number>;
    expect(listing.is_full).toBe(1);
  });

  it("calls notification functions on join", async () => {
    const { notifyListingAuthor, notifyGroupFull } = await import("@/lib/notifications");
    const listingId = insertListing(authorId);
    addMember(listingId, authorId);

    const req = createTestRequest(`/api/listings/${listingId}/join`, { method: "POST" });
    await POST(req, createParams(String(listingId)));

    expect(notifyListingAuthor).toHaveBeenCalledWith(listingId, "Joiner");
    expect(notifyGroupFull).not.toHaveBeenCalled();
  });

  it("returns 400 when user has a pending application", async () => {
    const listingId = insertListing(authorId);
    testDb.prepare("INSERT INTO listing_applications (listing_id, user_id, status) VALUES (?, ?, 'pending')").run(listingId, joinerId);

    const req = createTestRequest(`/api/listings/${listingId}/join`, { method: "POST" });
    const response = await POST(req, createParams(String(listingId)));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("pending application");
  });

  it("allows join when user has a rejected application", async () => {
    const listingId = insertListing(authorId);
    addMember(listingId, authorId);
    testDb.prepare("INSERT INTO listing_applications (listing_id, user_id, status) VALUES (?, ?, 'rejected')").run(listingId, joinerId);

    const req = createTestRequest(`/api/listings/${listingId}/join`, { method: "POST" });
    const response = await POST(req, createParams(String(listingId)));
    const { status, data } = await parseResponse<{ ok: boolean }>(response);

    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("calls notifyGroupFull when group becomes full", async () => {
    const { notifyGroupFull } = await import("@/lib/notifications");
    const listingId = insertListing(authorId, { max_group_size: 2 });
    addMember(listingId, authorId);

    const req = createTestRequest(`/api/listings/${listingId}/join`, { method: "POST" });
    await POST(req, createParams(String(listingId)));

    expect(notifyGroupFull).toHaveBeenCalledWith(listingId, expect.any(String), expect.any(String));
  });
});
