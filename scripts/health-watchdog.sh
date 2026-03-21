#!/bin/bash
# Health watchdog — restarts PM2 if the server is unresponsive
# Run via cron: */5 * * * * /root/Projects/bookmate/scripts/health-watchdog.sh

set -euo pipefail

APP_DIR="/root/Projects/bookmate/app"
LOG_FILE="/root/Projects/bookmate/.claude-beat/logs/watchdog.log"
HEALTH_URL="http://127.0.0.1:3000/api/health"
TIMEOUT=10
MAX_RETRIES=2

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"
}

check_health() {
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$HEALTH_URL" 2>/dev/null || echo "000")
  echo "$status"
}

# Try health check with retries
healthy=false
for attempt in $(seq 1 "$MAX_RETRIES"); do
  status=$(check_health)
  if [ "$status" = "200" ]; then
    healthy=true
    break
  fi
  # Wait before retry
  sleep 5
done

if [ "$healthy" = true ]; then
  # Only log every 12th check (once per hour) to avoid log spam
  minute=$(date '+%M')
  if [ "$minute" -lt 5 ]; then
    log "OK — server healthy (HTTP $status)"
  fi
else
  log "ALERT — server unresponsive after $MAX_RETRIES attempts (last HTTP $status). Restarting PM2..."
  cd "$APP_DIR"
  npx pm2 restart bookmate >> "$LOG_FILE" 2>&1
  sleep 10
  # Verify restart worked
  status=$(check_health)
  if [ "$status" = "200" ]; then
    log "RECOVERED — server responding after restart (HTTP $status)"
  else
    log "CRITICAL — server still unresponsive after restart (HTTP $status)"
  fi
fi
