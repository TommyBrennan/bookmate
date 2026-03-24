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
    CREATE TABLE IF NOT EXISTS listing_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'approved', 'rejected')),
      message TEXT DEFAULT '',
      applied_at TEXT DEFAULT (datetime('now')),
      decided_at TEXT,
      UNIQUE(listing_id, user_id),
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
    CREATE TABLE IF NOT EXISTS pending_telegram_groups (
      listing_id INTEGER NOT NULL,
      telegram_chat_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (listing_id),
      FOREIGN KEY (listing_id) REFERENCES listings(id)
    );
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      rater_id INTEGER NOT NULL,
      rated_user_id INTEGER NOT NULL,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
      comment TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(listing_id, rater_id, rated_user_id),
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      FOREIGN KEY (rater_id) REFERENCES users(id),
      FOREIGN KEY (rated_user_id) REFERENCES users(id)
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
  getSession: vi.fn().mockResolvedValue(mockSession),
  requireAuth: vi.fn().mockImplementation(async () => {
    if (!mockSession.userId) return null;
    return mockSession;
  }),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

vi.mock("@/lib/telegram", () => ({
  isBotConfigured: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/discord", () => ({
  isBotConfigured: vi.fn().mockReturnValue(false),
}));

const { GET, PATCH, DELETE: DELETE_HANDLER } = await import("@/app/api/listings/[id]/route");

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
    max_group_size: number;
    is_full: number;
    requires_approval: number;
    telegram_link: string;
    discord_link: string;
  }> = {}
) {
  testDb.prepare(
    `INSERT INTO listings (author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full, requires_approval, telegram_link, discord_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    authorId,
    overrides.book_title ?? "Test Book",
    overrides.book_author ?? "Test Author",
    "1ch/wk",
    "2026-04-01",
    overrides.meeting_format ?? "text",
    overrides.max_group_size ?? 5,
    overrides.is_full ?? 0,
    overrides.requires_approval ?? 0,
    overrides.telegram_link ?? "",
    overrides.discord_link ?? ""
  );
  return testDb.prepare("SELECT last_insert_rowid() as id").get().id as number;
}

function addMember(listingId: number, userId: number) {
  testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(listingId, userId);
}

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/listings/[id]", () => {
  let authorId: number;

  beforeEach(() => {
    testDb.exec("DELETE FROM listing_applications");
    testDb.exec("DELETE FROM listing_members");
    testDb.exec("DELETE FROM notifications");
    testDb.exec("DELETE FROM ratings");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");
    authorId = insertUser();
    mockSession.userId = undefined;
  });

  it("returns 400 for invalid listing ID", async () => {
    const req = createTestRequest("/api/listings/abc");
    const response = await GET(req, createParams("abc"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Invalid listing ID");
  });

  it("returns 404 for non-existent listing", async () => {
    const req = createTestRequest("/api/listings/999");
    const response = await GET(req, createParams("999"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Listing not found");
  });

  it("returns listing details with members", async () => {
    const listingId = insertListing(authorId);
    addMember(listingId, authorId);

    const req = createTestRequest(`/api/listings/${listingId}`);
    const response = await GET(req, createParams(String(listingId)));
    const { status, data } = await parseResponse<{ listing: Record<string, unknown> }>(response);

    expect(status).toBe(200);
    expect(data.listing.book_title).toBe("Test Book");
    expect(data.listing.author_name).toBe("Test User");
    expect(data.listing.memberCount).toBe(1);
    expect(data.listing.isMember).toBe(false);
    expect(data.listing.isAuthor).toBe(false);
  });

  it("returns isMember=true when session user is a member", async () => {
    const listingId = insertListing(authorId);
    addMember(listingId, authorId);
    mockSession.userId = authorId;

    const req = createTestRequest(`/api/listings/${listingId}`);
    const response = await GET(req, createParams(String(listingId)));
    const { data } = await parseResponse<{ listing: Record<string, unknown> }>(response);

    expect(data.listing.isMember).toBe(true);
    expect(data.listing.isAuthor).toBe(true);
  });

  it("returns 404 for full listing when user is not a member", async () => {
    const listingId = insertListing(authorId, { is_full: 1 });
    addMember(listingId, authorId);

    const user2 = insertUser("other@example.com", "Other");
    mockSession.userId = user2;

    const req = createTestRequest(`/api/listings/${listingId}`);
    const response = await GET(req, createParams(String(listingId)));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("This listing is no longer available");
  });

  it("returns listing for full listing when user is the author", async () => {
    const listingId = insertListing(authorId, { is_full: 1 });
    addMember(listingId, authorId);
    mockSession.userId = authorId;

    const req = createTestRequest(`/api/listings/${listingId}`);
    const response = await GET(req, createParams(String(listingId)));
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
  });

  it("shows pending applicants to the author", async () => {
    const listingId = insertListing(authorId, { requires_approval: 1 });
    addMember(listingId, authorId);
    mockSession.userId = authorId;

    const applicant = insertUser("applicant@example.com", "Applicant");
    testDb.prepare("INSERT INTO listing_applications (listing_id, user_id, status) VALUES (?, ?, 'pending')").run(listingId, applicant);

    const req = createTestRequest(`/api/listings/${listingId}`);
    const response = await GET(req, createParams(String(listingId)));
    const { data } = await parseResponse<{ listing: { pendingApplicants: unknown[] } }>(response);

    expect(data.listing.pendingApplicants.length).toBe(1);
  });

  it("shows hasApplied status for applicants", async () => {
    const listingId = insertListing(authorId, { requires_approval: 1 });
    addMember(listingId, authorId);

    const applicant = insertUser("applicant@example.com", "Applicant");
    testDb.prepare("INSERT INTO listing_applications (listing_id, user_id, status) VALUES (?, ?, 'pending')").run(listingId, applicant);
    mockSession.userId = applicant;

    const req = createTestRequest(`/api/listings/${listingId}`);
    const response = await GET(req, createParams(String(listingId)));
    const { data } = await parseResponse<{ listing: { hasApplied: boolean; applicationStatus: string } }>(response);

    expect(data.listing.hasApplied).toBe(true);
    expect(data.listing.applicationStatus).toBe("pending");
  });
});

describe("PATCH /api/listings/[id]", () => {
  let authorId: number;

  beforeEach(() => {
    testDb.exec("DELETE FROM listing_applications");
    testDb.exec("DELETE FROM listing_members");
    testDb.exec("DELETE FROM notifications");
    testDb.exec("DELETE FROM ratings");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");
    authorId = insertUser();
    mockSession.userId = authorId;
    mockSession.email = "test@example.com";
    mockSession.displayName = "Test User";
  });

  it("returns 401 when not authenticated", async () => {
    mockSession.userId = undefined;
    const listingId = insertListing(authorId);

    const req = createTestRequest(`/api/listings/${listingId}`, {
      method: "PATCH",
      body: { language: "French" },
    });
    const response = await PATCH(req, createParams(String(listingId)));
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });

  it("returns 400 for invalid listing ID", async () => {
    const req = createTestRequest("/api/listings/abc", {
      method: "PATCH",
      body: { language: "French" },
    });
    const response = await PATCH(req, createParams("abc"));
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 404 for non-existent listing", async () => {
    const req = createTestRequest("/api/listings/999", {
      method: "PATCH",
      body: { language: "French" },
    });
    const response = await PATCH(req, createParams("999"));
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });

  it("returns 403 when non-author tries to edit", async () => {
    const listingId = insertListing(authorId);
    const otherId = insertUser("other@example.com", "Other");
    mockSession.userId = otherId;

    const req = createTestRequest(`/api/listings/${listingId}`, {
      method: "PATCH",
      body: { language: "French" },
    });
    const response = await PATCH(req, createParams(String(listingId)));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(403);
    expect(data.error).toBe("Only the author can edit this listing");
  });

  it("returns 400 when listing has telegram link shared", async () => {
    const listingId = insertListing(authorId, { telegram_link: "https://t.me/test" });

    const req = createTestRequest(`/api/listings/${listingId}`, {
      method: "PATCH",
      body: { language: "French" },
    });
    const response = await PATCH(req, createParams(String(listingId)));
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("updates listing fields successfully", async () => {
    const listingId = insertListing(authorId);

    const req = createTestRequest(`/api/listings/${listingId}`, {
      method: "PATCH",
      body: { language: "French", meetingFormat: "voice" },
    });
    const response = await PATCH(req, createParams(String(listingId)));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const updated = testDb.prepare("SELECT language, meeting_format FROM listings WHERE id = ?").get(listingId) as Record<string, string>;
    expect(updated.language).toBe("French");
    expect(updated.meeting_format).toBe("voice");
  });

  it("returns 400 for invalid meeting format", async () => {
    const listingId = insertListing(authorId);

    const req = createTestRequest(`/api/listings/${listingId}`, {
      method: "PATCH",
      body: { meetingFormat: "invalid" },
    });
    const response = await PATCH(req, createParams(String(listingId)));
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 when no fields to update", async () => {
    const listingId = insertListing(authorId);

    const req = createTestRequest(`/api/listings/${listingId}`, {
      method: "PATCH",
      body: {},
    });
    const response = await PATCH(req, createParams(String(listingId)));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("No fields to update");
  });

  it("prevents reducing group size below current member count", async () => {
    const listingId = insertListing(authorId, { max_group_size: 5 });
    addMember(listingId, authorId);
    const u2 = insertUser("u2@test.com", "U2");
    addMember(listingId, u2);
    const u3 = insertUser("u3@test.com", "U3");
    addMember(listingId, u3);

    const req = createTestRequest(`/api/listings/${listingId}`, {
      method: "PATCH",
      body: { maxGroupSize: "2" },
    });
    const response = await PATCH(req, createParams(String(listingId)));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("Cannot reduce group size");
  });
});

describe("DELETE /api/listings/[id]", () => {
  let authorId: number;

  beforeEach(() => {
    testDb.exec("DELETE FROM listing_applications");
    testDb.exec("DELETE FROM listing_members");
    testDb.exec("DELETE FROM notifications");
    testDb.exec("DELETE FROM ratings");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");
    authorId = insertUser();
    mockSession.userId = authorId;
    mockSession.email = "test@example.com";
    mockSession.displayName = "Test User";
  });

  it("returns 401 when not authenticated", async () => {
    mockSession.userId = undefined;
    const listingId = insertListing(authorId);

    const req = createTestRequest(`/api/listings/${listingId}`, { method: "DELETE" });
    const response = await DELETE_HANDLER(req, createParams(String(listingId)));
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });

  it("returns 403 when non-author tries to delete", async () => {
    const listingId = insertListing(authorId);
    const otherId = insertUser("other@example.com", "Other");
    mockSession.userId = otherId;

    const req = createTestRequest(`/api/listings/${listingId}`, { method: "DELETE" });
    const response = await DELETE_HANDLER(req, createParams(String(listingId)));
    const { status } = await parseResponse(response);

    expect(status).toBe(403);
  });

  it("returns 400 when listing has chat link shared", async () => {
    const listingId = insertListing(authorId, { telegram_link: "https://t.me/test" });

    const req = createTestRequest(`/api/listings/${listingId}`, { method: "DELETE" });
    const response = await DELETE_HANDLER(req, createParams(String(listingId)));
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("deletes listing and related data successfully", async () => {
    const listingId = insertListing(authorId);
    addMember(listingId, authorId);

    const req = createTestRequest(`/api/listings/${listingId}`, { method: "DELETE" });
    const response = await DELETE_HANDLER(req, createParams(String(listingId)));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const listing = testDb.prepare("SELECT * FROM listings WHERE id = ?").get(listingId);
    expect(listing).toBeUndefined();

    const members = testDb.prepare("SELECT * FROM listing_members WHERE listing_id = ?").all(listingId);
    expect(members.length).toBe(0);
  });

  it("returns 404 for non-existent listing", async () => {
    const req = createTestRequest("/api/listings/999", { method: "DELETE" });
    const response = await DELETE_HANDLER(req, createParams("999"));
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });
});
