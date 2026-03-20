# Registered Platforms

## GitHub
- Repo: TommyBrennan/bookmate
- Project: Bookmate (#1)
- Auth: GH_TOKEN in .claude-beat/.env

## Production Deployment
- **Host**: VPS at 89.167.127.85 (IPv6: 2a01:4f9:c013:600f::1)
- **URL**: http://89.167.127.85:3000
- **Process manager**: PM2 (via npx, ecosystem.config.js)
- **Port**: 3000 (direct, no reverse proxy)
- **Deploy**: `./scripts/deploy.sh`
- **No HTTPS**: No domain configured, no certbot/nginx (no root access)
- **DB**: SQLite at app/data/ (persistent on disk)
