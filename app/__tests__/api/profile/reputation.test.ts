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
  userId: 1 as number | undefined,
}));

const mockRequireAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ default: testDb }));
vi.mock("@/lib/session", () => ({ requireAuth: mockRequireAuth }));

const { GET } = await import("@/app/api/profile/reputation/route");

interface ReputationData {
  reputation: {
    averageScore: number;
    totalRatings: number;
    completedGroups: number;
    groupsRated: number;
    breakdown: Record<number, number>;
    recentRatings: Array<{
      score: number;
      created_at: string;
      book_title: string;
      comment?: string;
    }>;
  };
}

describe("GET /api/profile/reputation", () => {
  let user2Id: number;
  let listingId: number;

  beforeEach(() => {
    vi.clearAllMocks();
    testDb.exec("DELETE FROM ratings");
    testDb.exec("DELETE FROM listing_members");
    testDb.exec("DELETE FROM listings");
    testDb.exec("DELETE FROM users");

    testDb.prepare(
      "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
    ).run(1, "user1@test.com", "hash", "User One");

    const result = testDb.prepare(
      "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)"
    ).run("user2@test.com", "hash", "User Two");
    user2Id = Number(result.lastInsertRowid);

    const listingResult = testDb.prepare(
      `INSERT INTO listings (author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(1, "Test Book", "Author", "1 ch/week", "2026-01-01", "text", 5, 1);
    listingId = Number(listingResult.lastInsertRowid);

    testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(listingId, 1);
    testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(listingId, user2Id);

    mockSession.userId = 1;
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const req = createTestRequest("/api/profile/reputation");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns zero reputation for user with no ratings", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);
    const req = createTestRequest("/api/profile/reputation");
    const res = await GET(req);
    const { data } = await parseResponse<ReputationData>(res);
    expect(data.reputation.averageScore).toBe(0);
    expect(data.reputation.totalRatings).toBe(0);
    expect(data.reputation.recentRatings).toEqual([]);
  });

  it("calculates average score and breakdown correctly", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);

    // User2 rates User1 with score 5
    testDb.prepare(
      "INSERT INTO ratings (listing_id, rater_id, rated_user_id, score, comment) VALUES (?, ?, ?, ?, ?)"
    ).run(listingId, user2Id, 1, 5, "Great reader!");

    const req = createTestRequest("/api/profile/reputation");
    const res = await GET(req);
    const { data } = await parseResponse<ReputationData>(res);
    expect(data.reputation.averageScore).toBe(5);
    expect(data.reputation.totalRatings).toBe(1);
    expect(data.reputation.breakdown[5]).toBe(1);
    expect(data.reputation.breakdown[4]).toBe(0);
  });

  it("counts completed groups correctly", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);
    const req = createTestRequest("/api/profile/reputation");
    const res = await GET(req);
    const { data } = await parseResponse<ReputationData>(res);
    // User 1 is member of 1 full listing
    expect(data.reputation.completedGroups).toBe(1);
  });

  it("includes comments for own profile", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);
    testDb.prepare(
      "INSERT INTO ratings (listing_id, rater_id, rated_user_id, score, comment) VALUES (?, ?, ?, ?, ?)"
    ).run(listingId, user2Id, 1, 4, "Insightful discussions");

    const req = createTestRequest("/api/profile/reputation");
    const res = await GET(req);
    const { data } = await parseResponse<ReputationData>(res);
    expect(data.reputation.recentRatings[0].comment).toBe("Insightful discussions");
  });

  it("strips comments when viewing another user's profile", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);
    // Rate user2
    testDb.prepare(
      "INSERT INTO ratings (listing_id, rater_id, rated_user_id, score, comment) VALUES (?, ?, ?, ?, ?)"
    ).run(listingId, 1, user2Id, 3, "Secret feedback");

    const req = createTestRequest(`/api/profile/reputation?userId=${user2Id}`);
    const res = await GET(req);
    const { data } = await parseResponse<ReputationData>(res);
    expect(data.reputation.recentRatings[0]).not.toHaveProperty("comment");
  });

  it("returns 400 for invalid userId parameter", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);
    const req = createTestRequest("/api/profile/reputation?userId=abc");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("counts groups rated by user", async () => {
    mockRequireAuth.mockResolvedValue(mockSession);
    // User1 rates User2
    testDb.prepare(
      "INSERT INTO ratings (listing_id, rater_id, rated_user_id, score) VALUES (?, ?, ?, ?)"
    ).run(listingId, 1, user2Id, 4);

    const req = createTestRequest("/api/profile/reputation");
    const res = await GET(req);
    const { data } = await parseResponse<ReputationData>(res);
    expect(data.reputation.groupsRated).toBe(1);
  });
});
