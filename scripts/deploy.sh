#!/bin/bash
# Bookmate production deployment script
# Usage: ./scripts/deploy.sh
set -euo pipefail

APP_DIR="/root/Projects/bookmate/app"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPTS_DIR")"

FORCE_DEPLOY="${1:-}"

echo "=== Bookmate Deploy ==="
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# 1. Record current commit before pull
cd "$PROJECT_DIR"
BEFORE_COMMIT=$(git rev-parse HEAD)

# 2. Pull latest code
echo ""
echo "--- Pulling latest code ---"
git pull --ff-only origin main || echo "Warning: git pull failed, deploying current code"

AFTER_COMMIT=$(git rev-parse HEAD)

# 3. Check if PM2 process is running
PM2_RUNNING=$(cd "$APP_DIR" && npx pm2 pid bookmate 2>/dev/null || echo "")
if [ -z "$PM2_RUNNING" ] || [ "$PM2_RUNNING" = "0" ] || [ "$PM2_RUNNING" = "" ]; then
  PM2_ONLINE=false
else
  PM2_ONLINE=true
fi

# 4. Skip rebuild if no changes and PM2 is already running
if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ] && [ "$PM2_ONLINE" = true ] && [ "$FORCE_DEPLOY" != "--force" ]; then
  echo ""
  echo "✅ No new commits and PM2 is running — skipping rebuild."
  echo "   Current commit: $AFTER_COMMIT"
  echo "   Use './scripts/deploy.sh --force' to force a rebuild."
  echo ""

  # Still verify production is healthy
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Production healthy (HTTP $HTTP_CODE)"
  else
    echo "⚠️  Production returned HTTP $HTTP_CODE — forcing rebuild..."
    FORCE_DEPLOY="--force"
  fi

  if [ "$FORCE_DEPLOY" != "--force" ]; then
    echo ""
    echo "--- PM2 Status ---"
    cd "$APP_DIR" && npx pm2 list
    exit 0
  fi
fi

echo ""
echo "Deploying: $BEFORE_COMMIT → $AFTER_COMMIT"

# 5. Install dependencies
echo ""
echo "--- Installing dependencies ---"
cd "$APP_DIR"
npm ci

# 6. Build
echo ""
echo "--- Building Next.js ---"
npm run build

# 7. Generate SESSION_SECRET if not set
if [ ! -f "$APP_DIR/.env.local" ] || ! grep -q "SESSION_SECRET" "$APP_DIR/.env.local" 2>/dev/null; then
  echo ""
  echo "--- Generating SESSION_SECRET ---"
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  echo "SESSION_SECRET=$SECRET" >> "$APP_DIR/.env.local"
  echo "Generated new SESSION_SECRET"
fi

# 8. Restart with PM2
echo ""
echo "--- Starting/restarting with PM2 ---"
cd "$APP_DIR"
npx pm2 delete bookmate 2>/dev/null || true
npx pm2 start ecosystem.config.js

# 9. Save PM2 process list (survives reboot with pm2 startup)
npx pm2 save

# 10. Verify
echo ""
echo "--- Verifying deployment ---"
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Deployment successful! HTTP $HTTP_CODE"
  echo ""
  echo "Access the app:"
  echo "  Local:  http://localhost:3000"
  echo "  IPv4:   http://$(curl -4 -s ifconfig.me 2>/dev/null || echo '<your-ip>'):3000"
  echo "  IPv6:   http://[$(curl -6 -s ifconfig.me 2>/dev/null || echo '<your-ipv6>')]:3000"
else
  echo "❌ Deployment may have failed. HTTP code: $HTTP_CODE"
  echo "Check logs: npx pm2 logs bookmate"
  exit 1
fi

echo ""
echo "--- PM2 Status ---"
npx pm2 list
echo ""
echo "Useful commands:"
echo "  npx pm2 logs bookmate    # View logs"
echo "  npx pm2 restart bookmate # Restart"
echo "  npx pm2 stop bookmate    # Stop"
echo "  npx pm2 monit            # Monitor"
