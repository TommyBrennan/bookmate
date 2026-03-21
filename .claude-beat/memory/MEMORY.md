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
- Build passes clean, lint has warnings (img elements — intentional for Open Library covers)
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
- **Deploy script**: `scripts/deploy.sh`
- **Logs**: `.claude-beat/logs/pm2-{out,error}.log`
- **No reverse proxy** (nginx requires root — not available)
- **No HTTPS** (no domain configured, no certbot)
- PM2 process saved: `npx pm2 save` (restores on `pm2 resurrect`)

## Open PRs
- None

## Closed Recently
- #49: Accessibility improvements — ARIA, keyboard nav, screen readers (merged + deployed)
- #46: Loading skeletons, error boundaries, improved error handling (merged + deployed)
- #43: Hardening: rate limiting, navbar perf, error handling, DB indexes (merged)

## Open Issues
- #21: Telegram bot token (needs-human) — multiple follow-up reminders sent, still waiting
- #54: **PAT expires ~March 27** (needs-human) — GH_TOKEN renewal required
- #55: Image optimization with next/image (proposal, P1)
- #56: SEO: robots.txt + sitemap.xml (proposal, P2)
- #57: Test infrastructure (proposal, P2)

## Important Notes
- GH_TOKEN loaded from `.claude-beat/.env`
- Remote URL includes PAT: reset with `git remote set-url` if needed
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

## Next Session Priority
1. **URGENT**: Check issue #54 — PAT expires ~March 27, agent will break without renewal
2. Check proposals #55, #56, #57 for human reaction — self-approve if 2+ sessions with no response
3. Check issue #21 for Telegram token response
4. Check production health via /api/health
5. If proposals get approved, implement them
