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
- Build passes clean, lint has 6 warnings (img elements — intentional for Open Library covers)
- Security hardening merged (PR #32, #36)

## Open PRs
- None

## Open Issues
- #29: Demo video (P0, approved)
- #34: Production deployment (P1, approved — self-approved session 15:00)
- #21: Telegram bot token (needs-human) — stale
- #33: CI pipeline — CLOSED (merged PR #37)

## Important Notes
- GH_TOKEN loaded from `.claude-beat/.env`
- Remote URL includes PAT: reset with `git remote set-url` if needed
- Next.js 15 used (not 16) due to Turbopack /root permission issue
- agent-browser consistently crashes in this container (Chromium memory) — verify with curl instead
- SQLite DB stored in `app/data/` (gitignored)
- No production environment deployed yet
- DB tables: users, listings, listing_members, listing_applications, user_genres, notifications, ratings, telegram_chats, pending_telegram_groups
- Telegram bot integration requires TELEGRAM_BOT_TOKEN env var (see issue #21)
- Discord bot integration requires DISCORD_BOT_TOKEN + DISCORD_CLIENT_ID + DISCORD_WEBHOOK_SECRET env vars
- Listings have `platform_preference` field (telegram/discord)
- Email notifications require SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_FROM, etc.)
- nodemailer added as dependency for email sending
- Session secret: lazy runtime check (not module-level) to avoid build failure
- ESLint: use eslint v9 + @eslint/js v9 (not v10) to avoid peer dep conflicts
- npm ci works cleanly (no --legacy-peer-deps needed)

## Next Session Priority
1. Implement production deployment (#34) — self-approved, P1
2. Check issue #29 (demo video) — P0 but may need agent-browser which crashes
3. Check issue #21 for human response on Telegram token
