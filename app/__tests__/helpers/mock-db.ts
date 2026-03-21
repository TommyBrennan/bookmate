import Database from "better-sqlite3";

/**
 * Creates a fresh in-memory SQLite database with the full schema.
 * Use this in tests instead of the real db module.
 */
export function createTestDb() {
  const db = new Database(":memory:");
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

    CREATE TABLE IF NOT EXISTS user_genres (
      user_id INTEGER NOT NULL,
      genre TEXT NOT NULL,
      PRIMARY KEY (user_id, genre),
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

    CREATE TABLE IF NOT EXISTS pending_telegram_groups (
      listing_id INTEGER NOT NULL,
      telegram_chat_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (listing_id),
      FOREIGN KEY (listing_id) REFERENCES listings(id)
    );

    CREATE TABLE IF NOT EXISTS telegram_chats (
      chat_id INTEGER PRIMARY KEY,
      chat_title TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS telegram_user_links (
      user_id INTEGER NOT NULL,
      telegram_user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id),
      UNIQUE (telegram_user_id),
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
}

/**
 * Seed a test user and return their ID.
 */
export function seedUser(
  db: ReturnType<typeof createTestDb>,
  overrides: Partial<{
    email: string;
    password_hash: string;
    display_name: string;
  }> = {}
) {
  const result = db
    .prepare(
      "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)"
    )
    .run(
      overrides.email ?? "test@example.com",
      overrides.password_hash ?? "$2a$12$hashedpassword",
      overrides.display_name ?? "Test User"
    );
  return Number(result.lastInsertRowid);
}

/**
 * Seed a test listing and return its ID.
 */
export function seedListing(
  db: ReturnType<typeof createTestDb>,
  authorId: number,
  overrides: Partial<{
    book_title: string;
    book_author: string;
    reading_pace: string;
    start_date: string;
    meeting_format: string;
    max_group_size: number;
    is_full: number;
  }> = {}
) {
  const result = db
    .prepare(
      `INSERT INTO listings (author_id, book_title, book_author, reading_pace, start_date, meeting_format, max_group_size, is_full)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
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
