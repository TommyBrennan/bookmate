# Decisions Log

## 2026-03-19: Next.js 15 over 16
- Next.js 16 Turbopack fails in this environment (can't read /root directory)
- Downgraded to Next.js 15 which uses webpack by default
- No feature loss for our use case

## 2026-03-19: SQLite for MVP
- Per PRD, using SQLite with file storage in app/data/
- Simple, no external dependencies
- Good enough for MVP; can migrate to Postgres later if needed

## 2026-03-19: iron-session for auth
- Lightweight session management with encrypted httpOnly cookies
- No separate session store needed
- Password hashing with bcrypt (12 rounds)

## 2026-03-19: Session logs gitignored
- Session logs contain raw API data that may include tokens
- Added to .gitignore to prevent secret leaks via GitHub push protection
