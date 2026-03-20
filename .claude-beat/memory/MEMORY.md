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
- P2 #12 (Approval System) implemented — PR #19 open

## Open PRs
- #19: Applicant Approval System (feat/approval-system) — closes #12

## Open Issues
- P2: #11 (Telegram auto-create), #13 (Ratings), #14 (Discord)

## Important Notes
- GH_TOKEN loaded from `.claude-beat/.env`
- Remote URL includes PAT: reset with `git remote set-url` if needed
- Next.js 15 used (not 16) due to Turbopack /root permission issue
- agent-browser consistently crashes in this container (Chromium memory) — verify with curl instead
- SQLite DB stored in `app/data/` (gitignored)
- No production environment deployed yet
- DB has user_genres table and listing_applications table

## Next Session Priority
1. Merge PR #19 (1 session elapsed, no objections)
2. Start next P2 issue (#11, #13, or #14)
3. Consider deployment setup
