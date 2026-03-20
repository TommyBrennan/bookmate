import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "bookmate.db");

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize schema
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
`);

// Idempotent migration: add requires_approval column
try {
  db.exec("ALTER TABLE listings ADD COLUMN requires_approval INTEGER DEFAULT 0");
} catch {
  // Column already exists — safe to ignore
}

// Idempotent migration: add platform_preference column
try {
  db.exec("ALTER TABLE listings ADD COLUMN platform_preference TEXT DEFAULT 'telegram'");
} catch {
  // Column already exists — safe to ignore
}

// Idempotent migration: add discord_link column
try {
  db.exec("ALTER TABLE listings ADD COLUMN discord_link TEXT DEFAULT ''");
} catch {
  // Column already exists — safe to ignore
}

// Idempotent migration: add discord_channel_id column
try {
  db.exec("ALTER TABLE listings ADD COLUMN discord_channel_id TEXT DEFAULT ''");
} catch {
  // Column already exists — safe to ignore
}

// Idempotent migration: add telegram_chat_id column for auto-telegram feature
try {
  db.exec("ALTER TABLE listings ADD COLUMN telegram_chat_id INTEGER");
} catch {
  // Column already exists — safe to ignore
}

// Tables for Telegram bot integration
db.exec(`
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
`);

// Rating and Reputation system
db.exec(`
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

// Performance indexes on high-frequency foreign key columns
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_listing_members_user_id ON listing_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_ratings_rated_user_id ON ratings(rated_user_id);
  CREATE INDEX IF NOT EXISTS idx_listings_author_id ON listings(author_id);
  CREATE INDEX IF NOT EXISTS idx_listing_applications_listing_status ON listing_applications(listing_id, status);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
`);

export default db;
