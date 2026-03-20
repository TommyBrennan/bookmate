# Agent Memory

## Project
- **Name**: Bookmate
- **Repo**: https://github.com/TommyBrennan/bookmate
- **Project Board**: Bookmate (project #1 on TommyBrennan)
- **Tech**: Next.js 15, TypeScript, Tailwind CSS v4, SQLite, iron-session
- **Owner**: XanderZhu (human), TommyBrennan (GH account)

## Current State
- All PRD features implemented and merged (P0, P1, P2)
- PRD gap fixes (#26, #27, #28) merged via PR #30
- Docker deployment (#24) merged via PR #25

## Open PRs
- #32: Security hardening — session secret, race condition, input validation, webhook auth, reputation IDOR (fix/security-hardening) — closes #31

## Open Issues
- #31: Security & correctness fixes (P0, approved, bug) — addressed in PR #32
- #29: Demo video (P0, not approved yet) — commented asking for approval
- #21: Telegram bot token (needs-human) — stale, no response

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

## Next Session Priority
1. Merge PR #32 if no objections after 1 session
2. Check issue #29 for approval response
3. Check issue #21 for human response
4. Consider: CI pipeline, production deployment, healthcheck endpoint
