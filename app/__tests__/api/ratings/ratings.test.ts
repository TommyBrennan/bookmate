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
      FOREIGN KEY (user_id) REFERENCES users(id),
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

const mockRequireAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ default: testDb }));

vi.mock("@/lib/session", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

const { POST, GET } = await import("@/app/api/ratings/route");

function seedData() {
  testDb.exec("DELETE FROM ratings");
  testDb.exec("DELETE FROM listing_members");
  testDb.exec("DELETE FROM notifications");
  testDb.exec("DELETE FROM listings");
  testDb.exec("DELETE FROM users");

  // Create users
  testDb.prepare(
    "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
  ).run(1, "alice@test.com", "hash", "Alice");
  testDb.prepare(
    "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
  ).run(2, "bob@test.com", "hash", "Bob");
  testDb.prepare(
    "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
  ).run(3, "charlie@test.com", "hash", "Charlie");

  // Create a full listing
  testDb.prepare(
    "INSERT INTO listings (id, author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(1, 1, "Test Book", "Author", "1 ch/week", "2026-01-01", "text", 3, 1);

  // Add members
  testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(1, 1);
  testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(1, 2);
  testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(1, 3);
}

describe("POST /api/ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedData();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const req = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 1, ratedUserId: 2, score: 5 },
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 1 },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid score", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 1, ratedUserId: 2, score: 6 },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 for non-integer score", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 1, ratedUserId: 2, score: 3.5 },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when rating yourself", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 1, ratedUserId: 1, score: 5 },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("cannot rate yourself");
  });

  it("returns 404 for non-existent listing", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 999, ratedUserId: 2, score: 4 },
    });
    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it("returns 400 for non-full listing", async () => {
    // Create an open listing
    testDb.prepare(
      "INSERT INTO listings (id, author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(2, 1, "Open Book", "Author", "1 ch/week", "2026-01-01", "text", 4, 0);
    testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(2, 1);
    testDb.prepare("INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)").run(2, 2);

    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 2, ratedUserId: 2, score: 4 },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("completed reading groups");
  });

  it("returns 403 when rater is not a member", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 99 });
    const req = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 1, ratedUserId: 2, score: 4 },
    });
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it("returns 400 when rated user is not a member", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 1, ratedUserId: 99, score: 4 },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("successfully creates a rating", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 1, ratedUserId: 2, score: 5, comment: "Great reader!" },
    });
    const response = await POST(req);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);

    const rating = testDb.prepare(
      "SELECT * FROM ratings WHERE listing_id = 1 AND rater_id = 1 AND rated_user_id = 2"
    ).get() as { score: number; comment: string };
    expect(rating.score).toBe(5);
    expect(rating.comment).toBe("Great reader!");
  });

  it("updates existing rating instead of creating duplicate", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });

    // First rating
    const req1 = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 1, ratedUserId: 2, score: 3 },
    });
    await POST(req1);

    // Update rating
    const req2 = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 1, ratedUserId: 2, score: 5, comment: "Updated" },
    });
    const response = await POST(req2);
    expect(response.status).toBe(200);

    const ratings = testDb.prepare(
      "SELECT * FROM ratings WHERE listing_id = 1 AND rater_id = 1 AND rated_user_id = 2"
    ).all() as { score: number; comment: string }[];
    expect(ratings).toHaveLength(1);
    expect(ratings[0].score).toBe(5);
    expect(ratings[0].comment).toBe("Updated");
  });

  it("returns 400 for comment exceeding 1000 chars", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings", {
      method: "POST",
      body: { listingId: 1, ratedUserId: 2, score: 4, comment: "x".repeat(1001) },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});

describe("GET /api/ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedData();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const req = createTestRequest("/api/ratings?listingId=1");
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it("returns 400 when listingId is missing", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings");
    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid listingId", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings?listingId=abc");
    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it("returns 403 for non-members", async () => {
    mockRequireAuth.mockResolvedValue({ userId: 99 });
    const req = createTestRequest("/api/ratings?listingId=1");
    const response = await GET(req);
    expect(response.status).toBe(403);
  });

  it("returns given and received ratings", async () => {
    // Alice rates Bob
    testDb.prepare(
      "INSERT INTO ratings (listing_id, rater_id, rated_user_id, score, comment) VALUES (?, ?, ?, ?, ?)"
    ).run(1, 1, 2, 5, "Great!");
    // Charlie rates Alice
    testDb.prepare(
      "INSERT INTO ratings (listing_id, rater_id, rated_user_id, score, comment) VALUES (?, ?, ?, ?, ?)"
    ).run(1, 3, 1, 4, "Good reader");

    mockRequireAuth.mockResolvedValue({ userId: 1 });
    const req = createTestRequest("/api/ratings?listingId=1");
    const response = await GET(req);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.givenRatings).toHaveLength(1);
    expect(data.givenRatings[0].rated_user_id).toBe(2);
    expect(data.givenRatings[0].display_name).toBe("Bob");

    expect(data.receivedRatings).toHaveLength(1);
    expect(data.receivedRatings[0].rater_id).toBe(3);
    expect(data.receivedRatings[0].display_name).toBe("Charlie");
  });
});
