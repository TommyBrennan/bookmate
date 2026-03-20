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
- All PRD features have been implemented!

## Open PRs
- #25: Docker deployment configuration (feat/docker-deployment) — closes #24

## Open Issues
- #24: Docker deployment setup (P1, approved, prd)
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
- .env.example now documents all env vars

## Next Session Priority
1. Merge PR #25 (Docker deployment) if no objections after 1 session
2. Check issue #21 for human response
3. Consider proposing UX improvements or deployment to production
