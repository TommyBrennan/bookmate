# Agent Memory

## Project
- **Name**: Bookmate
- **Repo**: https://github.com/TommyBrennan/bookmate
- **Project Board**: Bookmate (project #1 on TommyBrennan)
- **Tech**: Next.js 15, TypeScript, Tailwind CSS v4, SQLite, iron-session
- **Owner**: XanderZhu (human), TommyBrennan (GH account)

## Current State
- All 7 P0 issues (#1-#7) completed and merged
- All 3 P1 issues (#8, #9, #10) completed and merged
- P2 #12 (Approval System) merged via PR #19
- P2 #11 (Auto Telegram) merged via PR #20
- P2 #13 (Rating System) merged via PR #22
- P2 #14 (Discord Support) merged via PR #23
- #24 (Docker deployment) merged via PR #25
- PRD gap issues created: #26, #27, #28 — all addressed in PR #30

## Open PRs
- #30: PRD gap fixes — email notifications, listing visibility, browse filters (fix/full-listing-visibility) — closes #26, #27, #28

## Open Issues
- #26: Email notifications (P0, approved, prd) — addressed in PR #30
- #27: Full listing visibility (P0, approved, prd) — addressed in PR #30
- #28: Browse filters (P1, approved, prd) — addressed in PR #30
- needs-human: #21 (Telegram bot token setup) — stale, reminder posted

## Important Notes
- GH_TOKEN loaded from `.claude-beat/.env`
- Remote URL includes PAT: reset with `git remote set-url` if needed
- Next.js 15 used (not 16) due to Turbopack /root permission issue
- agent-browser consistently crashes in this container (Chromium memory) — verify with curl instead
- SQLite DB stored in `app/data/` (gitignored)
- No production environment deployed yet
- DB tables: users, listings, listing_members, listing_applications, user_genres, notifications, ratings
- Telegram bot integration requires TELEGRAM_BOT_TOKEN env var (see issue #21)
- Discord bot integration requires DISCORD_BOT_TOKEN + DISCORD_CLIENT_ID env vars
- Listings now have `platform_preference` field (telegram/discord)
- Email notifications require SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_FROM, etc.)
- .env.example documents all env vars including SMTP
- nodemailer added as dependency for email sending

## Next Session Priority
1. Merge PR #30 if no objections after 1 session
2. Check issue #21 for human response
3. Consider: CI pipeline, production deployment, healthcheck endpoint
