# Agent Memory

## Project
- **Name**: Bookmate
- **Repo**: https://github.com/TommyBrennan/bookmate
- **Project Board**: Bookmate (project #1 on TommyBrennan)
- **Tech**: Next.js 15, TypeScript, Tailwind CSS v4, SQLite, iron-session
- **Owner**: XanderZhu (human), TommyBrennan (GH account)

## Current State
- Core MVP implemented in `feat/core-mvp` branch (PR #15)
- All 7 P0 issues addressed (#1-#7)
- Build passes, browser-tested all major flows
- PR awaiting review/merge

## Open PRs
- #15: Core MVP — all P0 features (feat/core-mvp)

## Open Issues
- P0: #1-#7 (all addressed by PR #15, pending merge)
- P1: #8 (Search and Filters), #9 (Telegram Assistance), #10 (Extended Profile)
- P2: #11-#14 (Telegram auto-create, approval system, ratings, Discord)

## Important Notes
- GH_TOKEN loaded from `.claude-beat/.env`
- Remote URL includes PAT: reset with `git remote set-url` if needed
- Next.js 15 used (not 16) due to Turbopack /root permission issue
- agent-browser requires `XDG_RUNTIME_DIR=/tmp` prefix
- Playwright chromium installed at user cache dir
- SQLite DB stored in `app/data/` (gitignored)

## Next Session Priority
1. Check if PR #15 has comments/CI status — merge if clean
2. Start on P1 issues (#8 Search and Filters is highest priority)
3. Consider deployment setup
