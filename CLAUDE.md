# Bookmate — Project Context

## Tech Stack
- **Framework:** Next.js 15 (App Router) with TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** SQLite via better-sqlite3 (stored in `app/data/`)
- **Auth:** iron-session + bcryptjs (httpOnly cookies)
- **Book data:** Open Library API (free, no key needed)

## Project Structure
```
app/                    # Next.js application
  app/                  # App Router pages & API routes
    api/auth/           # Auth endpoints (register, login, logout, me)
    api/listings/       # Listing CRUD + join + telegram
    api/notifications/  # Notification endpoints
    api/profile/        # Profile update
    auth/               # Auth pages (login, register)
    listings/           # Listing pages (create, detail)
    notifications/      # Notifications page
    profile/            # Profile page
  components/           # React components (Navbar, BookSearch)
  lib/                  # Core libs (db, session, notifications)
```

## Development
```bash
cd app && npm install && npm run dev
```

## Build
```bash
cd app && npm run build
```

## Production Deployment
```bash
# First time or redeploy:
./scripts/deploy.sh

# PM2 commands:
cd app && npx pm2 list              # Status
cd app && npx pm2 logs bookmate     # Logs
cd app && npx pm2 restart bookmate  # Restart
cd app && npx pm2 stop bookmate     # Stop
```
- **Process manager:** PM2 (via npx)
- **Config:** `app/ecosystem.config.js`
- **Port:** 3000 (direct access, no reverse proxy)
- **URL:** `http://89.167.127.85:3000`
- **Env vars:** `app/.env.local` (see `app/.env.example`)
- **Logs:** `.claude-beat/logs/pm2-{out,error}.log`

## Key Conventions
- All API routes return JSON with `{ error: "..." }` on failure
- Auth uses iron-session with httpOnly cookies
- SQLite DB auto-initializes schema on first import
- Book covers come from Open Library covers API
- Listings auto-close when member count reaches max_group_size
