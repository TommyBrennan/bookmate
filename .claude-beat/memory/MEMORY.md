# Agent Memory

## Project
- **Name**: Bookmate
- **Repo**: https://github.com/TommyBrennan/bookmate
- **Project Board**: Bookmate (project #1 on TommyBrennan)
- **Tech**: Next.js 15, TypeScript, Tailwind CSS v4, SQLite, iron-session
- **Owner**: XanderZhu (human), TommyBrennan (GH account)

## Current State
- All PRD features implemented and merged (P0, P1, P2)
- CI pipeline live: GitHub Actions runs lint + type check + unit tests + build + E2E tests on push/PR to main
- ESLint flat config with typescript-eslint, react-hooks, @next/eslint-plugin-next
- Build passes clean, lint clean (no warnings)
- **E2E tests added** (PR #115): Playwright configuration with 4 test suites covering authentication, listings, group formation, and profile flows
- Security hardening merged (PR #32, #36)
- **Production deployed** via PM2 on port 3000 — http://89.167.127.85:3000
- Health endpoint: `/api/health` (DB check, uptime, stats)
- Custom 404 page (branded, with CTA)
- OG + Twitter Card meta tags on listing pages (book cover, title, description)
- Loading skeletons on all routes (root, listing detail, profile, notifications)
- Error boundaries on all routes with retry functionality
- Focus-visible styles for keyboard accessibility
- **Accessibility improvements** (PR #49, merged + deployed):
  - ARIA labels, roles, expanded states on all interactive elements
  - Keyboard navigation on BookSearch dropdown (combobox pattern)
  - autocomplete attributes on auth forms
  - role="alert" on error messages
  - Skip-to-content link
  - role="tablist"/tab/tabpanel on profile tabs
  - role="radiogroup"/radio on format/platform buttons
  - role="checkbox" with keyboard support on approval toggle

## Production
- **URL**: http://89.167.127.85:3000
- **Process manager**: PM2 (via npx)
- **Config**: `app/ecosystem.config.js`
  - Enhanced: max_restarts: 10, min_uptime: 10s, exp_backoff_restart_delay
- **Deploy script**: `scripts/deploy.sh`
  - Smart rebuild: skips when no new commits (use `--force` to override)
  - Rollback: `--rollback` flag restores previous build
  - Enhanced health checks: 5 retries with DB verification
  - Build backups: stored in `.builds/` (keeps last 5)
  - Deployment log: `.claude-beat/logs/deployments.log`
  - Quick restart: `--skip-build` flag
- **Endpoints**:
  - `/api/health` — DB check, uptime, stats
  - `/api/metrics` — Performance monitoring (requests, errors, response times, DB stats)
- **Security headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection, X-DNS-Prefetch-Control
- **Logs**: `.claude-beat/logs/pm2-{out,error}.log`
- **No reverse proxy** (nginx requires root — not available)
- **No HTTPS** (no domain configured, no certbot)
- PM2 process saved: `npx pm2 save` (restores on `pm2 resurrect`)

## Open PRs
- None (all PRs merged)

## Closed Recently
- #114: Deployment reliability improvements — implemented and deployed (rollback, health checks, metrics endpoint)
- #110: Code review round 18 — link exposure, reject race, type safety, validation — merged + deployed
- #108: Code review round 17 — session destroy, PATCH body, abort leak, server action probes — merged + deployed
- #107: Code review round 16 — score type validation, DELETE TOCTOU race — merged + deployed
- #106: Security headers + smart deploy — merged + deployed
- #105: Code review round 15 — LIKE injection, auth bypass, unbounded queries, transporter cache — merged + deployed
- #103: Code review round 14 — module-load freezing, stale sessions, TOCTOU races, type validation — merged + deployed
- #101: Code review round 13 — PATCH is_full gap, transaction safety, orphaned applications — merged + deployed

## Open Issues
- #21: Telegram bot token (needs-human) — multiple follow-up reminders sent, still waiting (not blocking)
- #54: **PAT expires ~March 27** (needs-human) — GH_TOKEN renewal required, ~2 days left (CRITICAL, 25+ reminders sent)

## Closed Recently
- #113: Performance optimization and monitoring — ✅ IMPLEMENTED, MERGED, DEPLOYED (2026-03-24 23:01 UTC)

## Important Notes
- GH_TOKEN loaded from `.claude-beat/.env`
- Remote URL includes PAT: reset with `git remote set-url` if needed
- Session logs and screenshots are gitignored (contain secrets in historical logs)
- Next.js 15 used (not 16) due to Turbopack /root permission issue
- agent-browser WORKS if: export XDG_RUNTIME_DIR=/tmp/runtime-$(id -u) && mkdir -p "$XDG_RUNTIME_DIR"
- agent-browser crashes after extended use (memory pressure) — keep recording sessions short, restart between scenes
- ffmpeg installed as static binary in ~/bin — add to PATH: export PATH="$HOME/bin:$PATH"
- ELEVENLABS_API_KEY not available — demo video has no voiceover
- Demo video at .claude-beat/logs/demos/demo_2026-03-20.mp4 (5 scenes, ~1:51)
- **Performance monitoring** (PR #116): API response time tracking, bundle analyzer, slow query detection
- Run bundle analyzer: `ANALYZE=true npm run build` from app directory
- SQLite DB stored in `app/data/` (gitignored)
- DB tables: users, listings, listing_members, listing_applications, user_genres, notifications, ratings, telegram_chats, pending_telegram_groups
- Telegram bot integration requires TELEGRAM_BOT_TOKEN env var (see issue #21)
- Discord bot integration requires DISCORD_BOT_TOKEN + DISCORD_CLIENT_ID + DISCORD_WEBHOOK_SECRET env vars
- Listings have `platform_preference` field (telegram/discord)
- Email notifications require SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_FROM, etc.)
- nodemailer added as dependency for email sending
- Session secret: lazy runtime check (not module-level) to avoid build failure
- ESLint: use eslint v9 + @eslint/js v9 (not v10) to avoid peer dep conflicts
- npm ci works cleanly (no --legacy-peer-deps needed)
- No root/sudo access on server — can't install nginx, Docker, or system packages
- PM2 available via npx (not globally installed)

## Test Suite
- 207 unit tests across 22 test files, all passing
- **E2E tests added** (PR #115): Playwright configuration with 4 test suites (23 tests):
  - Authentication: registration, login, logout, protected routes, validation
  - Listings: create, browse, view details, edit, delete
  - Groups: join, leave, auto-close when full
  - Profile: view, update, notifications, user menu
- Tested: auth (login, register), health, listings (browse, detail, create, join, edit, delete, telegram, discord, auto-telegram, auto-discord), notifications, profile, profile/genres, profile/reading, profile/reputation, ratings, rate-limit, telegram/setup, telegram/webhook, discord/setup, discord/webhook
- All API routes now have test coverage
- @vitest/coverage-v8 installed for coverage reporting
- **E2E test commands**: `npm run test:e2e`, `npm run test:e2e:ui`, `npm run test:e2e:debug`

## Components
- `BookCover` — reusable book cover component with error fallback, uses `unoptimized` to bypass Next.js image proxy for Open Library covers that redirect through archive.org

## Next Session Priority
1. **URGENT**: PAT expires ~March 27 (#54) — ~2 days remaining (CRITICAL, 20+ reminders sent)
2. Check issue #21 for Telegram token response
3. Monitor production health
4. Consider implementing connection pooling with better-sqlite3-pool

## Recent Sessions
- **2026-03-25 13:00 UTC**: Production health check verified (healthy, uptime ~14h, 0 restarts, memory 147.4MB). Browser test passed, homepage loads correctly. All 207 unit tests passing, lint clean. Added 25th reminder for PAT expiration. All PRD features implemented, no code changes needed.
- **2026-03-25 12:00 UTC**: Production health check verified (healthy, uptime ~13h, 0 restarts, memory 148.7MB). Browser test passed, homepage loads correctly. All 207 unit tests passing, lint clean. Added 24th reminder for PAT expiration. All PRD features implemented, no code changes needed.
- **2026-03-25 11:00 UTC**: Production health check verified (healthy, uptime ~12h, 0 restarts, memory 147.9MB). Browser test passed, homepage loads correctly. All 207 unit tests passing, lint clean. Added 23rd reminder for PAT expiration. All PRD features implemented, no code changes needed.
- **2026-03-25 10:00 UTC**: Production health check verified (healthy, uptime ~11h, 0 restarts, memory 145.7MB). Browser test passed, homepage loads correctly. All 207 unit tests passing, lint clean. Added 22nd reminder for PAT expiration. All PRD features implemented, no code changes needed.
- **2026-03-25 08:00 UTC**: Production health check verified (healthy, uptime ~9h, 0 restarts, memory 136.4MB). Browser test passed, homepage loads correctly. Added 20th reminder for PAT expiration. All PRD features implemented, all tests passing. No code changes needed.
- **2026-03-25 07:00 UTC**: Production health check verified (healthy, uptime ~8h, 0 restarts, memory 169.2MB). Added 19th reminder for PAT expiration. All PRD features implemented, all tests passing. No code changes needed.
- **2026-03-25 06:00 UTC**: Production health check verified (healthy, uptime ~7h, 0 restarts, memory 169.2MB). Added 18th reminder for PAT expiration. All PRD features implemented, all tests passing. No code changes needed.
- **2026-03-25 05:00 UTC**: Production health check verified (healthy, uptime ~6h, 0 restarts, memory 169.2MB). Added 17th reminder for PAT expiration. All PRD features implemented, all tests passing. No code changes needed.
- **2026-03-25 04:00 UTC**: Production health check verified (healthy, uptime ~5h, 0 restarts). Added 17th reminder for PAT expiration. No code changes needed.
- **2026-03-25 03:00 UTC**: Production health check verified (healthy, uptime ~4h, 0 restarts). Added 16th reminder for PAT expiration. No code changes needed.

## New Production Features (2026-03-24)
- Deploy rollback: `./scripts/deploy.sh --rollback`
- Build backups stored in `.builds/` (last 5 builds)
- Deployment logging: `.claude-beat/logs/deployments.log`
- Enhanced health checks: 5 retries, DB verification
- Performance metrics endpoint: `/api/metrics` (authenticated only)
  - Tracks: requests, errors, slow queries, response times (avg, p95)
  - Database stats: users, listings, memberships, notifications, file size
  - Uptime tracking (seconds + formatted)
