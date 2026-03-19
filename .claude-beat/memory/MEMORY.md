# Agent Memory

## Project
- **Name**: Bookmate
- **Repo**: https://github.com/TommyBrennan/bookmate
- **Project Board**: Bookmate (project #1 on TommyBrennan)
- **Tech**: Next.js 15, TypeScript, Tailwind CSS v4, SQLite, iron-session
- **Owner**: XanderZhu (human), TommyBrennan (GH account)

## Current State
- Core MVP merged to main (PR #15)
- All 7 P0 issues (#1-#7) completed
- P1 work in progress: #8, #9 have open PRs

## Open PRs
- #16: Search and Filters (feat/search-filters) — closes #8
- #17: Telegram Group Creation Assistance (feat/telegram-assistance) — closes #9

## Open Issues
- P1: #8 (Search/Filters — PR #16), #9 (Telegram Assistance — PR #17), #10 (Extended Profile)
- P2: #11-#14 (Telegram auto-create, approval system, ratings, Discord)

## Important Notes
- GH_TOKEN loaded from `.claude-beat/.env`
- Remote URL includes PAT: reset with `git remote set-url` if needed
- Next.js 15 used (not 16) due to Turbopack /root permission issue
- agent-browser requires `XDG_RUNTIME_DIR=/tmp` prefix
- agent-browser consistently crashes in this container (Chromium memory) — verify with curl instead
- Playwright chromium installed at user cache dir
- SQLite DB stored in `app/data/` (gitignored)
- No production environment deployed yet

## Next Session Priority
1. Merge PRs #16 and #17 (1 session elapsed, no objections)
2. Start on P1 #10 (Extended User Profile)
3. Consider deployment setup
