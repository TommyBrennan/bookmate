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
- All 3 P1 issues completed: #8 (merged), #9 (merged), #10 (PR #18 open)

## Open PRs
- #18: Extended User Profile (feat/extended-profile) — closes #10

## Open Issues
- P1: #10 (Extended Profile — PR #18)
- P2: #11 (Telegram auto-create), #12 (Approval system), #13 (Ratings), #14 (Discord)

## Important Notes
- GH_TOKEN loaded from `.claude-beat/.env`
- Remote URL includes PAT: reset with `git remote set-url` if needed
- Next.js 15 used (not 16) due to Turbopack /root permission issue
- agent-browser consistently crashes in this container (Chromium memory) — verify with curl instead
- SQLite DB stored in `app/data/` (gitignored)
- No production environment deployed yet
- DB has user_genres table added in feat/extended-profile branch

## Next Session Priority
1. Merge PR #18 (1 session elapsed, no objections)
2. All P1 issues will be complete — consider deployment setup
3. Start P2 issues if time permits (#11-#14)
