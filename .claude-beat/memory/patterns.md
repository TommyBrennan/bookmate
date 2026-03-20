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

## Working Directory
- Project root: /root/Projects/bookmate
- App directory: /root/Projects/bookmate/app
- Always use full paths for .claude-beat/.env references
