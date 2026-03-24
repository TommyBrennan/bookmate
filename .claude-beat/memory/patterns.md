# Learned Patterns

## GitHub Authentication
- Always export GH_TOKEN from .env before running gh commands:
  ```bash
  export GH_TOKEN=$(grep GH_TOKEN /root/Projects/bookmate/.claude-beat/.env | cut -d= -f2)
  ```
- Cannot `--add-reviewer` when token owner is the PR author (HTTP 422)
- Repo created under TommyBrennan (not XanderZhu — can't create for other users)

## Session Flow
- First session bootstraps repo, creates issues from PRD as `approved` + `prd`
- PRD features are pre-approved — no proposal step needed
- Focus on housekeeping when blocked: organize project board, update memory

## Environment
- Find agent-browser with: `which agent-browser`
- agent-browser requires `XDG_RUNTIME_DIR=/tmp` prefix due to socket dir permissions
- Playwright chromium needs manual install: `npx playwright install chromium`
- Git remote uses PAT in URL: `https://ghp_...@github.com/TommyBrennan/bookmate.git`
- Git remote URL may lose PAT between sessions — re-set with `git remote set-url`
- Must set `git config user.email` and `user.name` each session if not set globally

## Build
- Next.js 16 Turbopack fails in this environment (can't read /root dir)
- Use Next.js 15 which defaults to webpack
- Build from app/ directory: `cd app && npx next build`
- `useRef<T>()` needs explicit `undefined` arg in React 19: `useRef<T>(undefined)`
- better-sqlite3 `.all()` returns `unknown[]` — cast explicitly for TS

## Browser Testing
- agent-browser WORKS with: `export XDG_RUNTIME_DIR=/tmp/runtime-$(id -u) && mkdir -p "$XDG_RUNTIME_DIR"`
- Crashes after extended use (~5+ min) due to Chromium memory pressure
- Restart between recording scenes: `agent-browser close && rm -rf $XDG_RUNTIME_DIR/agent-browser/ && sleep 2`
- For snapshot timeouts on pages with many elements (e.g., book search dropdown), use `agent-browser screenshot` or JS eval instead
- Book search results can't use `find text` (multiple matches) — use JS: `document.querySelector("button[type=button].w-full").click()`
- Reading pace input ref (@e17) times out — use `agent-browser eval` with nativeInputValueSetter to set values
- For API testing: `curl -s URL | python3 -m json.tool`
- ffmpeg: static binary at ~/bin/ffmpeg — `export PATH="$HOME/bin:$PATH"` needed each session
- When recording demos: login user BEFORE starting recording, then navigate to target page

## Deployment
- No root/sudo access — can't apt-get install, create systemd services, or install nginx
- PM2 available via npx (not global): `npx pm2 start/stop/restart/list/logs`
- Deploy script: `./scripts/deploy.sh` (smart: skips rebuild when no new commits; `--force` to override)
- Deploy script compares HEAD before/after `git pull` — use `--force` when code was already pulled but not yet built
- Production runs on port 3000 directly (no reverse proxy)
- Public IP: 89.167.127.85 (IPv4), 2a01:4f9:c013:600f::1 (IPv6)
- Kill stale dev servers before deploy: check `ss -tlnp | grep 3000`
- PM2 ecosystem config at `app/ecosystem.config.js`
- PM2 logs at `.claude-beat/logs/pm2-{out,error}.log`

## React + SQLite
- SQLite stores booleans as integers (0/1). In JSX, `{0 && <Component />}` renders "0" as text. Always use `!!value` or `Boolean(value)` for numeric fields in `&&` conditionals.
- Git `add` with bracket directories like `[id]` needs escaping or use from project root

## Security
- Telegram webhook commands (/link, /link_ID) must verify the sender is the listing author via telegram_user_links table
- Always validate external URLs before storing (e.g., book_cover_url must start with https://covers.openlibrary.org/)
- Notification failures should never mask successful DB transactions — wrap in separate try/catch
- Move related DB writes inside the same transaction for atomicity (e.g., rejection of pending apps when group fills)
- Query string parameters from URL are always strings — parseInt() before DB queries on integer columns

## Working Directory
- Project root: /root/Projects/bookmate
- App directory: /root/Projects/bookmate/app
- Always use full paths for .claude-beat/.env references

## Security
- Use `crypto.timingSafeEqual` for secret comparisons (not `!==`) to prevent timing oracle attacks
- Always `typeof` check JSON body fields before string operations — `parseInt(obj)` silently coerces objects via `.toString()`
- HTML-escape user-controlled content before embedding in email HTML body
- Re-read mutable DB values inside transactions to prevent stale data from concurrent writes
- `lib/crypto-utils.ts` provides `safeCompare()` and `escapeHtmlForEmail()` utilities
