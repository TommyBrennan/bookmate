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
  `);
  return db;
});

const mockDiscord = vi.hoisted(() => ({
  createTextChannel: vi.fn().mockResolvedValue({ id: "ch-123", name: "bookmate-test-book" }),
  createChannelInvite: vi.fn().mockResolvedValue("https://discord.gg/abc123"),
  sendChannelMessage: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/db", () => ({ default: testDb }));

vi.mock("@/lib/discord", () => mockDiscord);

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

const { POST } = await import("@/app/api/discord/webhook/route");

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
    discord_link: string;
    book_title: string;
  }> = {}
) {
  testDb
    .prepare(
      `INSERT INTO listings (author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full, discord_link)
       VALUES (?, ?, 'Test Author', '1ch/wk', '2026-04-01', 'text', 5, ?, ?)`
    )
    .run(authorId, overrides.book_title ?? "Test Book", overrides.is_full ?? 0, overrides.discord_link ?? "");
  return testDb.prepare("SELECT last_insert_rowid() as id").get().id as number;
}

function addMember(listingId: number, userId: number) {
  testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(listingId, userId);
}

describe("POST /api/discord/webhook", () => {
  beforeEach(() => {
    testDb.exec("DELETE FROM listing_members");
    testDb.exec("DELETE FROM notifications");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");
    vi.stubEnv("DISCORD_WEBHOOK_SECRET", "discord-webhook-secret");
    mockDiscord.createTextChannel.mockResolvedValue({ id: "ch-123", name: "bookmate-test-book" });
    mockDiscord.createChannelInvite.mockResolvedValue("https://discord.gg/abc123");
    mockDiscord.sendChannelMessage.mockResolvedValue(true);
  });

  it("returns 500 when webhook secret is not configured", async () => {
    vi.stubEnv("DISCORD_WEBHOOK_SECRET", "");
    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: "link", guildId: "g1", listingId: 1 },
      headers: { "X-Discord-Webhook-Secret": "anything" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });

  it("returns 403 when secret header is wrong", async () => {
    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: "link", guildId: "g1", listingId: 1 },
      headers: { "X-Discord-Webhook-Secret": "wrong" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 400 for unknown event type", async () => {
    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: "unknown" },
      headers: { "X-Discord-Webhook-Secret": "discord-webhook-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("responds to Discord PING with PONG", async () => {
    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: 1 },
      headers: { "X-Discord-Webhook-Secret": "discord-webhook-secret" },
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data).toEqual({ type: 1 });
  });

  it("returns 400 when guildId or listingId missing for link type", async () => {
    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: "link", guildId: "", listingId: 0 },
      headers: { "X-Discord-Webhook-Secret": "discord-webhook-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 404 when listing not found", async () => {
    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: "link", guildId: "guild-1", listingId: 999 },
      headers: { "X-Discord-Webhook-Secret": "discord-webhook-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns 400 when group is not full", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 0 });
    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: "link", guildId: "guild-1", listingId },
      headers: { "X-Discord-Webhook-Secret": "discord-webhook-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 when discord link already set", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1, discord_link: "https://discord.gg/existing" });
    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: "link", guildId: "guild-1", listingId },
      headers: { "X-Discord-Webhook-Secret": "discord-webhook-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("creates channel and links successfully", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1 });
    addMember(listingId, userId);

    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: "link", guildId: "guild-1", listingId },
      headers: { "X-Discord-Webhook-Secret": "discord-webhook-secret" },
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("inviteLink", "https://discord.gg/abc123");

    // Verify DB was updated
    const listing = testDb.prepare("SELECT discord_link, discord_channel_id FROM listings WHERE id = ?").get(listingId) as {
      discord_link: string;
      discord_channel_id: string;
    };
    expect(listing.discord_link).toBe("https://discord.gg/abc123");
    expect(listing.discord_channel_id).toBe("ch-123");
  });

  it("uses provided channelId instead of creating one", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1 });
    addMember(listingId, userId);

    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: "link", guildId: "guild-1", listingId, channelId: "existing-ch" },
      headers: { "X-Discord-Webhook-Secret": "discord-webhook-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);

    // Should not have created a new channel
    expect(mockDiscord.createTextChannel).not.toHaveBeenCalled();

    // Should have created invite for the existing channel
    expect(mockDiscord.createChannelInvite).toHaveBeenCalledWith("existing-ch");
  });

  it("returns 500 when channel creation fails", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1 });
    mockDiscord.createTextChannel.mockResolvedValue(null);

    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: "link", guildId: "guild-1", listingId },
      headers: { "X-Discord-Webhook-Secret": "discord-webhook-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });

  it("returns 500 when invite creation fails", async () => {
    const userId = insertUser();
    const listingId = insertListing(userId, { is_full: 1 });
    mockDiscord.createChannelInvite.mockResolvedValue(null);

    const req = createTestRequest("http://localhost:3000/api/discord/webhook", {
      method: "POST",
      body: { type: "link", guildId: "guild-1", listingId },
      headers: { "X-Discord-Webhook-Secret": "discord-webhook-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });
});
