#!/usr/bin/env bash
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
BEAT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$BEAT_DIR")"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
LOG_DIR="$BEAT_DIR/logs/sessions"
SESSION_ID="$(date +%Y-%m-%d_%H-%M)"
LOG_FILE="$LOG_DIR/$SESSION_ID.md"
LOCK_FILE="/tmp/claude-beat-${PROJECT_NAME}.lock"

# ── User guard: re-exec as dedicated user if running as root ──────────────────
USER_FILE="$BEAT_DIR/.user"
if [ -f "$USER_FILE" ]; then
  BEAT_USER="$(cat "$USER_FILE")"
  if [ "$(id -u)" -eq 0 ] && [ -n "$BEAT_USER" ]; then
    echo "[$SESSION_ID] Re-executing as $BEAT_USER" >&2
    exec su -s /bin/bash "$BEAT_USER" -c "$0"
  fi
fi

# ── Load env ──────────────────────────────────────────────────────────────────
set -a; source "$BEAT_DIR/.env"; set +a

# ── Prevent concurrent sessions ───────────────────────────────────────────────
if [ -f "$LOCK_FILE" ]; then
  LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null)
  if kill -0 "$LOCK_PID" 2>/dev/null; then
    echo "[$SESSION_ID] Another session is running (PID $LOCK_PID). Skipping." >&2
    exit 0
  else
    echo "[$SESSION_ID] Stale lock (PID $LOCK_PID dead). Clearing." >&2
    rm -f "$LOCK_FILE"
  fi
fi
trap "rm -f $LOCK_FILE" EXIT
echo $$ > "$LOCK_FILE"

# ── Ensure log dir exists ─────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"

# ── Load system prompt ────────────────────────────────────────────────────────
SYSTEM_PROMPT=$(cat "$BEAT_DIR/SYSTEM_PROMPT.md")

# ── Run Claude from project root ──────────────────────────────────────────────
cd "$PROJECT_DIR"

echo "# Session: $SESSION_ID" > "$LOG_FILE"
echo "" >> "$LOG_FILE"

claude \
  --dangerously-skip-permissions \
  --model claude-opus-4-6 \
  --output-format stream-json \
  --verbose \
  --include-partial-messages \
  --system-prompt "$SYSTEM_PROMPT" \
  -p "Session started: $(date). Work directory: $PROJECT_DIR" \
  2>&1 | tee -a "$LOG_FILE" | \
  jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text' || true

echo "" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
echo "Session ended: $(date)" >> "$LOG_FILE"
