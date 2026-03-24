#!/bin/bash
# Bookmate production deployment script
# Usage: ./scripts/deploy.sh [--force] [--rollback]
set -euo pipefail

APP_DIR="/root/Projects/bookmate/app"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPTS_DIR")"
BUILDS_DIR="$PROJECT_DIR/.builds"
DEPLOY_LOG="$PROJECT_DIR/.claude-beat/logs/deployments.log"

# Parse arguments
FORCE_DEPLOY=""
ROLLBACK=false
SKIP_BUILD=false

for arg in "$@"; do
  case $arg in
    --force)
      FORCE_DEPLOY="--force"
      shift
      ;;
    --rollback)
      ROLLBACK=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    *)
      ;;
  esac
done

# Logging function
log_deployment() {
  local status="$1"
  local message="$2"
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] [$status] $message" | tee -a "$DEPLOY_LOG"
}

# Rollback function
rollback_deployment() {
  local reason="$1"
  log_deployment "ROLLBACK" "$reason"

  # Find most recent successful build
  if [ -d "$BUILDS_DIR" ]; then
    local latest_build=$(ls -t "$BUILDS_DIR" 2>/dev/null | head -1)
    if [ -n "$latest_build" ]; then
      log_deployment "ROLLBACK" "Restoring build: $latest_build"
      rm -rf "$APP_DIR/.next"
      cp -r "$BUILDS_DIR/$latest_build" "$APP_DIR/.next"

      # Restart PM2
      cd "$APP_DIR"
      npx pm2 reload bookmate

      # Wait for restart
      sleep 5

      # Verify health
      HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
      if [ "$HTTP_CODE" = "200" ]; then
        log_deployment "SUCCESS" "Rollback complete"
        return 0
      else
        log_deployment "ERROR" "Rollback failed - HTTP $HTTP_CODE"
        return 1
      fi
    else
      log_deployment "ERROR" "No backup build found for rollback"
      return 1
    fi
  else
    log_deployment "ERROR" "Builds directory does not exist"
    return 1
  fi
}

# Health check function
health_check() {
  local retries=5
  local delay=3
  local endpoint="${1:-http://localhost:3000}"

  log_deployment "HEALTH" "Checking endpoint: $endpoint"

  for i in $(seq 1 $retries); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
      # Also check health endpoint
      HEALTH_RESPONSE=$(curl -s "$endpoint/api/health" || echo "{}")
      if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"' && echo "$HEALTH_RESPONSE" | grep -q '"database":"connected"'; then
        log_deployment "HEALTH" "✅ Application healthy (HTTP $HTTP_CODE, DB connected)"
        return 0
      else
        log_deployment "WARN" "Health check returned unhealthy: $HEALTH_RESPONSE"
      fi
    fi

    if [ $i -lt $retries ]; then
      log_deployment "HEALTH" "Attempt $i/$retries failed (HTTP $HTTP_CODE), retrying in ${delay}s..."
      sleep $delay
    fi
  done

  log_deployment "ERROR" "Health check failed after $retries attempts (HTTP $HTTP_CODE)"
  return 1
}

echo "=== Bookmate Deploy ==="
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# Handle rollback
if [ "$ROLLBACK" = true ]; then
  echo ""
  echo "--- Rolling back to previous build ---"
  rollback_deployment "Manual rollback requested"
  echo ""
  echo "--- PM2 Status ---"
  cd "$APP_DIR" && npx pm2 list
  exit $?
fi

# 1. Record current commit before pull
cd "$PROJECT_DIR"
BEFORE_COMMIT=$(git rev-parse HEAD)

# 2. Pull latest code
echo ""
echo "--- Pulling latest code ---"
if ! git pull --ff-only origin main; then
  log_deployment "WARN" "git pull failed, deploying current code"
  AFTER_COMMIT="$BEFORE_COMMIT"
else
  AFTER_COMMIT=$(git rev-parse HEAD)
fi

# 3. Check if PM2 process is running
PM2_RUNNING=$(cd "$APP_DIR" && npx pm2 pid bookmate 2>/dev/null || echo "")
if [ -z "$PM2_RUNNING" ] || [ "$PM2_RUNNING" = "0" ] || [ "$PM2_RUNNING" = "" ]; then
  PM2_ONLINE=false
else
  PM2_ONLINE=true
fi

# 4. Skip rebuild if no changes and PM2 is already running
if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ] && [ "$PM2_ONLINE" = true ] && [ "$FORCE_DEPLOY" != "--force" ] && [ "$SKIP_BUILD" = false ]; then
  echo ""
  echo "✅ No new commits and PM2 is running — skipping rebuild."
  echo "   Current commit: $AFTER_COMMIT"
  echo "   Use './scripts/deploy.sh --force' to force a rebuild."
  echo ""

  # Still verify production is healthy
  if health_check; then
    echo ""
    echo "--- PM2 Status ---"
    cd "$APP_DIR" && npx pm2 list
    exit 0
  else
    echo "⚠️  Production health check failed — forcing rebuild..."
    FORCE_DEPLOY="--force"
  fi
fi

if [ "$SKIP_BUILD" = false ]; then
  echo ""
  log_deployment "DEPLOY" "Deploying: $BEFORE_COMMIT → $AFTER_COMMIT"

  # 5. Create builds directory for rollback
  mkdir -p "$BUILDS_DIR"

  # 6. Backup current build if it exists
  if [ -d "$APP_DIR/.next" ]; then
    BACKUP_NAME="build-$(date -u '+%Y%m%d-%H%M%S')"
    log_deployment "BACKUP" "Backing up current build to: $BACKUP_NAME"
    cp -r "$APP_DIR/.next" "$BUILDS_DIR/$BACKUP_NAME"

    # Keep only last 5 builds
    ls -t "$BUILDS_DIR" | tail -n +6 | xargs -I {} rm -rf "$BUILDS_DIR/{}"
  fi

  # 7. Install dependencies
  echo ""
  echo "--- Installing dependencies ---"
  cd "$APP_DIR"
  if ! npm ci; then
    log_deployment "ERROR" "npm ci failed"
    rollback_deployment "npm ci failed"
    exit 1
  fi

  # 8. Build
  echo ""
  echo "--- Building Next.js ---"
  if ! npm run build; then
    log_deployment "ERROR" "Build failed"
    rollback_deployment "Build failed"
    exit 1
  fi

  # 9. Save successful build timestamp
  date -u '+%Y-%m-%d %H:%M:%S UTC' > "$APP_DIR/.next/BUILD_TIME"
else
  log_deployment "SKIP" "Skipping build (--skip-build flag)"
  cd "$APP_DIR"
fi

# 10. Generate SESSION_SECRET if not set
if [ ! -f "$APP_DIR/.env.local" ] || ! grep -q "SESSION_SECRET" "$APP_DIR/.env.local" 2>/dev/null; then
  echo ""
  echo "--- Generating SESSION_SECRET ---"
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  echo "SESSION_SECRET=$SECRET" >> "$APP_DIR/.env.local"
  log_deployment "SECRET" "Generated new SESSION_SECRET"
fi

# 11. Restart with PM2
echo ""
echo "--- Starting/restarting with PM2 ---"
cd "$APP_DIR"
npx pm2 delete bookmate 2>/dev/null || true
npx pm2 start ecosystem.config.js

# 12. Save PM2 process list (survives reboot with pm2 startup)
npx pm2 save

# 13. Verify deployment
echo ""
echo "--- Verifying deployment ---"
sleep 3

if ! health_check; then
  log_deployment "ERROR" "Deployment health check failed"
  rollback_deployment "Health check failed after deployment"
  exit 1
fi

log_deployment "SUCCESS" "Deployment completed successfully"
echo "✅ Deployment successful!"
echo ""
echo "Access the app:"
echo "  Local:  http://localhost:3000"
echo "  IPv4:   http://$(curl -4 -s ifconfig.me 2>/dev/null || echo '<your-ip>'):3000"
echo "  IPv6:   http://[$(curl -6 -s ifconfig.me 2>/dev/null || echo '<your-ipv6>')]:3000"

echo ""
echo "--- PM2 Status ---"
cd "$APP_DIR" && npx pm2 list
echo ""
echo "Useful commands:"
echo "  ./scripts/deploy.sh --force   # Force rebuild"
echo "  ./scripts/deploy.sh --rollback # Rollback to previous build"
echo "  npx pm2 logs bookmate          # View logs"
echo "  npx pm2 restart bookmate       # Restart"
echo "  npx pm2 stop bookmate          # Stop"
echo "  npx pm2 monit                  # Monitor"
