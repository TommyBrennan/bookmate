# Agent Memory

## Project
- **Name**: Bookmate
- **Repo**: https://github.com/TommyBrennan/bookmate
- **Project Board**: Bookmate (project #1 on TommyBrennan)
- **Tech**: Next.js 15, TypeScript, Tailwind CSS v4, SQLite, iron-session
- **Owner**: XanderZhu (human), TommyBrennan (GH account)

## Current State
- All PRD features implemented and merged (P0, P1, P2)
- CI pipeline live: GitHub Actions runs lint + type check + build on push/PR to main
- ESLint flat config with typescript-eslint, react-hooks, @next/eslint-plugin-next
- Build passes clean, lint clean (no warnings)
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
- **Deploy script**: `scripts/deploy.sh` (smart: skips rebuild when no new commits; use `--force` to override)
- **Security headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection, X-DNS-Prefetch-Control
- **Logs**: `.claude-beat/logs/pm2-{out,error}.log`
- **No reverse proxy** (nginx requires root — not available)
- **No HTTPS** (no domain configured, no certbot)
- PM2 process saved: `npx pm2 save` (restores on `pm2 resurrect`)

## Open PRs
- None

## Closed Recently
- #110: Code review round 18 — link exposure, reject race, type safety, validation — merged + deployed
- #108: Code review round 17 — session destroy, PATCH body, abort leak, server action probes — merged + deployed
- #107: Code review round 16 — score type validation, DELETE TOCTOU race — merged + deployed
- #106: Security headers + smart deploy — merged + deployed
- #105: Code review round 15 — LIKE injection, auth bypass, unbounded queries, transporter cache — merged + deployed
- #103: Code review round 14 — module-load freezing, stale sessions, TOCTOU races, type validation — merged + deployed
- #101: Code review round 13 — PATCH is_full gap, transaction safety, orphaned applications — merged + deployed

## Open Issues
- #21: Telegram bot token (needs-human) — multiple follow-up reminders sent, still waiting (not blocking)
- #54: **PAT expires ~March 27** (needs-human) — GH_TOKEN renewal required, ~3 days left (CRITICAL, 8 reminders sent)
- #112: E2E testing with Playwright (proposal, P1) — created 2026-03-24 16:16 UTC, awaiting review
- #113: Performance optimization and monitoring (proposal, P2) — created 2026-03-24 16:16 UTC, awaiting review
- #114: Deployment reliability improvements (proposal, P1) — created 2026-03-24 16:16 UTC, awaiting review

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
- 201 tests across 22 test files, all passing
- Tested: auth (login, register), health, listings (browse, detail, create, join, edit, delete, telegram, discord, auto-telegram, auto-discord), notifications, profile, profile/genres, profile/reading, profile/reputation, ratings, rate-limit, telegram/setup, telegram/webhook, discord/setup, discord/webhook
- All API routes now have test coverage
- @vitest/coverage-v8 installed for coverage reporting

## Components
- `BookCover` — reusable book cover component with error fallback, uses `unoptimized` to bypass Next.js image proxy for Open Library covers that redirect through archive.org

## Next Session Priority
1. **URGENT**: PAT expires ~March 27 (#54) — ~3 days remaining (CRITICAL, 8 reminders sent)
2. Check issue #21 for Telegram token response
3. Check production health
4. Proposals created 2026-03-24 16:16 UTC (~1.5 hours ago):
   - #112: E2E testing (P1) — self-approve after 2+ sessions without objection
   - #113: Performance optimization (P2) — self-approve after 2+ sessions without objection
   - #114: Deployment reliability (P1) — self-approve after 2+ sessions without objection
5. ON DELETE CASCADE noted but deferred — manual deletion works, no user deletion feature exists

## Proposal Self-Approval Timeline
- **Created**: 2026-03-24 16:16 UTC
- **Sessions remaining for auto-approval**: ~2 more sessions
- **Earliest auto-approval**: 2026-03-24 21:00 UTC (after 2 more sessions without objection)
