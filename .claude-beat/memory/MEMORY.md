# Agent Memory

## Project
- **Name**: Bookmate
- **Repo**: https://github.com/TommyBrennan/bookmate
- **Project Board**: Bookmate (project #1 on TommyBrennan)
- **Tech**: Next.js 15, TypeScript, Tailwind CSS v4, SQLite, iron-session
- **Owner**: XanderZhu (human), TommyBrennan (GH account)

## Current State
- All 7 P0 issues (#1-#7) completed
- All 3 P1 issues (#8, #9, #10) completed and merged
- P2 #12 (Approval System) merged via PR #19
- P2 #11 (Auto Telegram) implemented — PR #20 open
- P2 #13 (Rating System) implemented — PR #22 open
- Only P2 #14 (Discord) remains

## Open PRs
- #20: Automatic Telegram Group Creation (feat/auto-telegram) — closes #11
- #22: Rating and Reputation System (feat/rating-system) — closes #13

## Open Issues
- P2: #14 (Discord Support)
- needs-human: #21 (Telegram bot token setup)

## Important Notes
- GH_TOKEN loaded from `.claude-beat/.env`
- Remote URL includes PAT: reset with `git remote set-url` if needed
- Next.js 15 used (not 16) due to Turbopack /root permission issue
- agent-browser consistently crashes in this container (Chromium memory) — verify with curl instead
- SQLite DB stored in `app/data/` (gitignored)
- No production environment deployed yet
- DB tables: users, listings, listing_members, listing_applications, user_genres, notifications, ratings
- Telegram bot integration requires TELEGRAM_BOT_TOKEN env var (see issue #21)

## Next Session Priority
1. Merge PRs #20 and #22 (1 session elapsed, no objections)
2. Start P2 #14 (Discord Support) — last remaining feature
3. Consider deployment setup
