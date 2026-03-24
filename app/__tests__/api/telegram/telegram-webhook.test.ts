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
    CREATE TABLE IF NOT EXISTS pending_telegram_groups (
      listing_id INTEGER NOT NULL,
      telegram_chat_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (listing_id)
    );
    CREATE TABLE IF NOT EXISTS telegram_chats (
      chat_id INTEGER PRIMARY KEY,
      chat_title TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS telegram_user_links (
      user_id INTEGER NOT NULL,
      telegram_user_id INTEGER NOT NULL,
      PRIMARY KEY (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  return db;
});

const mockTelegram = vi.hoisted(() => ({
  createChatInviteLink: vi.fn().mockResolvedValue("https://t.me/+invite123"),
  exportChatInviteLink: vi.fn().mockResolvedValue(null),
  sendMessage: vi.fn().mockResolvedValue(true),
  parseListingIdFromPayload: vi.fn().mockImplementation((payload: string) => {
    const match = payload.match(/^listing_(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }),
  escapeHtml: vi.fn().mockImplementation((text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  ),
}));

vi.mock("@/lib/db", () => ({ default: testDb }));

vi.mock("@/lib/telegram", () => mockTelegram);

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

const { POST } = await import("@/app/api/telegram/webhook/route");

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
    book_title: string;
  }> = {}
) {
  testDb
    .prepare(
      `INSERT INTO listings (author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full, telegram_link)
       VALUES (?, ?, 'Test Author', '1ch/wk', '2026-04-01', 'text', 5, ?, ?)`
    )
    .run(authorId, overrides.book_title ?? "Test Book", overrides.is_full ?? 0, overrides.telegram_link ?? "");
  return testDb.prepare("SELECT last_insert_rowid() as id").get().id as number;
}

function addMember(listingId: number, userId: number) {
  testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(listingId, userId);
}

describe("POST /api/telegram/webhook", () => {
  beforeEach(() => {
    testDb.exec("DELETE FROM listing_members");
    testDb.exec("DELETE FROM notifications");
    testDb.exec("DELETE FROM pending_telegram_groups");
    testDb.exec("DELETE FROM telegram_chats");
    testDb.exec("DELETE FROM telegram_user_links");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "webhook-secret");
    mockTelegram.createChatInviteLink.mockResolvedValue("https://t.me/+invite123");
    mockTelegram.exportChatInviteLink.mockResolvedValue(null);
    mockTelegram.sendMessage.mockResolvedValue(true);
  });

  it("returns 500 when webhook secret is not configured", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");
    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {},
      headers: { "X-Telegram-Bot-Api-Secret-Token": "anything" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });

  it("returns 403 when secret header is wrong", async () => {
    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {},
      headers: { "X-Telegram-Bot-Api-Secret-Token": "wrong-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 200 for empty update (no action)", async () => {
    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: { update_id: 1 },
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data).toEqual({ ok: true });
  });

  it("handles /start command with listing payload when sender is linked author", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1 });
    addMember(listingId, userId);
    // Link the telegram user to the listing author
    testDb.prepare("INSERT INTO telegram_user_links (user_id, telegram_user_id) VALUES (?, ?)").run(userId, 456);

    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {
        update_id: 2,
        message: {
          chat: { id: -100123, type: "group", title: "Reading Group" },
          text: `/start listing_${listingId}`,
          from: { id: 456 },
        },
      },
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
    });

    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);

    // Verify telegram_link was set
    const listing = testDb.prepare("SELECT telegram_link FROM listings WHERE id = ?").get(listingId) as { telegram_link: string };
    expect(listing.telegram_link).toBe("https://t.me/+invite123");
  });

  it("rejects /start command when sender is not the listing author", async () => {
    const authorId = insertUser("author@test.com", "Author");
    const listingId = insertListing(authorId, { is_full: 1 });
    addMember(listingId, authorId);
    // Link a different user
    const otherId = insertUser("other@test.com", "Other");
    testDb.prepare("INSERT INTO telegram_user_links (user_id, telegram_user_id) VALUES (?, ?)").run(otherId, 789);

    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {
        update_id: 2,
        message: {
          chat: { id: -100123, type: "group", title: "Reading Group" },
          text: `/start listing_${listingId}`,
          from: { id: 789 },
        },
      },
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
    });

    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);

    // Listing should NOT be linked
    const listing = testDb.prepare("SELECT telegram_link FROM listings WHERE id = ?").get(listingId) as { telegram_link: string };
    expect(listing.telegram_link).toBe("");

    // Should have sent a message about using /link
    expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
      -100123,
      expect.stringContaining("/link")
    );
  });

  it("handles pending_telegram_groups mapping via my_chat_member", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1 });
    addMember(listingId, userId);

    // Insert pending mapping
    testDb.prepare("INSERT INTO pending_telegram_groups (listing_id, telegram_chat_id) VALUES (?, ?)").run(listingId, -100999);

    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {
        update_id: 3,
        my_chat_member: {
          chat: { id: -100999, type: "group", title: "My Group" },
          from: { id: 789, first_name: "Author" },
          new_chat_member: {
            user: { id: 111, is_bot: true },
            status: "member",
          },
        },
      },
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
    });

    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);

    // Verify listing was linked
    const listing = testDb.prepare("SELECT telegram_link FROM listings WHERE id = ?").get(listingId) as { telegram_link: string };
    expect(listing.telegram_link).toBe("https://t.me/+invite123");

    // Verify pending mapping was deleted
    const pending = testDb.prepare("SELECT * FROM pending_telegram_groups WHERE listing_id = ?").get(listingId);
    expect(pending).toBeUndefined();
  });

  it("ignores my_chat_member when bot is not added as member/admin", async () => {
    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {
        update_id: 4,
        my_chat_member: {
          chat: { id: -100123, type: "group" },
          from: { id: 789, first_name: "User" },
          new_chat_member: {
            user: { id: 111, is_bot: true },
            status: "left",
          },
        },
      },
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
    });

    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    // No crash, just silent ignore
  });

  it("handles /link command with linked user and single unlinked listing", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1 });
    addMember(listingId, userId);

    // Link telegram user
    testDb.prepare("INSERT INTO telegram_user_links (user_id, telegram_user_id) VALUES (?, ?)").run(userId, 456);

    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {
        update_id: 5,
        message: {
          chat: { id: -100555, type: "group" },
          text: "/link",
          from: { id: 456 },
        },
      },
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
    });

    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);

    // Listing should be linked
    const listing = testDb.prepare("SELECT telegram_link FROM listings WHERE id = ?").get(listingId) as { telegram_link: string };
    expect(listing.telegram_link).toBe("https://t.me/+invite123");
  });

  it("handles /link command from unlinked telegram user", async () => {
    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {
        update_id: 6,
        message: {
          chat: { id: -100555, type: "group" },
          text: "/link",
          from: { id: 999 },
        },
      },
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
    });

    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
      -100555,
      expect.stringContaining("not linked")
    );
  });

  it("handles /link_ID command with verified ownership", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1 });
    addMember(listingId, userId);
    testDb.prepare("INSERT INTO telegram_user_links (user_id, telegram_user_id) VALUES (?, ?)").run(userId, 456);

    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {
        update_id: 7,
        message: {
          chat: { id: -100666, type: "group" },
          text: `/link_${listingId}`,
          from: { id: 456 },
        },
      },
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
    });

    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);

    const listing = testDb.prepare("SELECT telegram_link FROM listings WHERE id = ?").get(listingId) as { telegram_link: string };
    expect(listing.telegram_link).toBe("https://t.me/+invite123");
  });

  it("rejects /link_ID from non-author", async () => {
    const authorId = insertUser("author@test.com", "Author");
    const otherId = insertUser("other@test.com", "Other");
    const listingId = insertListing(authorId, { is_full: 1 });
    testDb.prepare("INSERT INTO telegram_user_links (user_id, telegram_user_id) VALUES (?, ?)").run(otherId, 789);

    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {
        update_id: 8,
        message: {
          chat: { id: -100777, type: "group" },
          text: `/link_${listingId}`,
          from: { id: 789 },
        },
      },
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
    });

    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
      -100777,
      expect.stringContaining("only link Telegram groups to your own")
    );
  });

  it("ignores non-group messages", async () => {
    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {
        update_id: 9,
        message: {
          chat: { id: 123, type: "private" },
          text: "/link",
          from: { id: 456 },
        },
      },
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
    });

    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    // No action taken for private chats
  });

  it("uses fallback exportChatInviteLink when createChatInviteLink fails", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1 });
    addMember(listingId, userId);
    // Link the telegram user to the author so /start succeeds
    testDb.prepare("INSERT INTO telegram_user_links (user_id, telegram_user_id) VALUES (?, ?)").run(userId, 456);

    mockTelegram.createChatInviteLink.mockResolvedValue(null);
    mockTelegram.exportChatInviteLink.mockResolvedValue("https://t.me/+fallback");

    const req = createTestRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: {
        update_id: 10,
        message: {
          chat: { id: -100888, type: "supergroup" },
          text: `/start listing_${listingId}`,
          from: { id: 456 },
        },
      },
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const listing = testDb.prepare("SELECT telegram_link FROM listings WHERE id = ?").get(listingId) as { telegram_link: string };
    expect(listing.telegram_link).toBe("https://t.me/+fallback");
  });
});
