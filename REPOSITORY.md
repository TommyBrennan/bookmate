# Bookmate Repository

## Overview

**Repository**: https://github.com/TommyBrennan/bookmate
**Project Board**: Bookmate (project #1 on TommyBrennan)
**Owner**: XanderZhu (human), TommyBrennan (GitHub account)

## Status

✅ **Production Live**: http://89.167.127.85:3000
- All P0, P1, and P2 features implemented
- CI/CD pipeline active (GitHub Actions)
- E2E tests passing (Playwright, 23 tests)
- Security hardening complete

## Tech Stack

- **Frontend + Backend**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite via better-sqlite3 (stored in `app/data/`)
- **Auth**: iron-session + bcryptjs (httpOnly cookies)
- **Book data**: Open Library API (free, no key needed)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Deployment**: PM2 (via npx) on port 3000

## Project Structure

```
app/                    # Next.js application
  app/                  # App Router pages & API routes
    api/auth/           # Auth endpoints (register, login, logout, me)
    api/listings/       # Listing CRUD + join + telegram
    api/notifications/  # Notification endpoints
    api/profile/        # Profile update
    auth/               # Auth pages (login, register)
    listings/           # Listing pages (create, detail)
    notifications/      # Notifications page
    profile/            # Profile page
  components/           # React components (Navbar, BookSearch)
  lib/                  # Core libs (db, session, notifications)
scripts/                # Deployment and utility scripts
.claude-beat/           # Agent workspace (logs, memory, configs)
```

## Development

```bash
cd app && npm install
npm run dev              # Start dev server
npm run build            # Production build
npm run test             # Run unit tests
npm run test:e2e         # Run E2E tests
npm run lint             # Lint code
```

## Production Deployment

```bash
# Deploy (smart: skips rebuild when no new commits)
./scripts/deploy.sh

# Force rebuild
./scripts/deploy.sh --force

# Rollback to previous build
./scripts/deploy.sh --rollback

# Quick restart (no rebuild)
./scripts/deploy.sh --skip-build

# PM2 management
cd app && npx pm2 list              # Status
cd app && npx pm2 logs bookmate     # Logs
cd app && npx pm2 restart bookmate  # Restart
cd app && npx pm2 stop bookmate     # Stop
```

## Environment Variables

See `app/.env.example` for required variables. Critical:
- `SESSION_SECRET` — iron-session secret (required)
- `GH_TOKEN` — GitHub Personal Access Token for agent (expires ~March 27, 2026)
- `TELEGRAM_BOT_TOKEN` — Telegram bot for auto-group creation (optional, see issue #21)

## Open Issues

- #54: GitHub PAT expires ~March 27, 2026 (CRITICAL - needs renewal)
- #21: Telegram bot token needed for auto-group creation (optional feature)

## Documentation

- `.claude-beat/PRD.md` — Product Requirements Document
- `.claude-beat/memory/MEMORY.md` — Agent memory and project state
- `.claude-beat/memory/patterns.md` — Learned patterns and conventions
- `.claude-beat/logs/sessions/` — Session logs
- `CLAUDE.md` — Project instructions for Claude Agent

## Key Conventions

- All API routes return JSON with `{ error: "..." }` on failure
- Auth uses iron-session with httpOnly cookies
- SQLite DB auto-initializes schema on first import
- Book covers come from Open Library covers API
- Listings auto-close when member count reaches max_group_size
- All features from PRD implemented (P0, P1, P2)

## CI/CD

- **GitHub Actions**: Runs on push/PR to main
  - Lint (ESLint)
  - Type check (TypeScript)
  - Unit tests (Vitest)
  - Build verification
  - E2E tests (Playwright)

## Monitoring

- Health endpoint: `/api/health`
- Metrics endpoint: `/api/metrics` (performance monitoring)
- PM2 logs: `.claude-beat/logs/pm2-{out,error}.log`
- Deployment logs: `.claude-beat/logs/deployments.log`

## Security

- Auth: httpOnly cookies + bcrypt + iron-session
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.
- Input validation on all API endpoints
- SQL injection prevention (parameterized queries)
- CSRF protection via session tokens

---

**Repository initialized**: 2026-03-20
**Last updated**: 2026-03-25
