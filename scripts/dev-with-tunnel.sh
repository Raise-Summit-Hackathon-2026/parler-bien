#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/.env.local"
PORT="${PORT:-3000}"
LOG="$(mktemp /tmp/cloudflared-parler-bien.XXXXXX.log)"

cleanup() {
  if [[ -n "${CF_PID:-}" ]] && kill -0 "$CF_PID" 2>/dev/null; then
    kill "$CF_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting cloudflared tunnel → http://localhost:$PORT"
cloudflared tunnel --url "http://localhost:$PORT" >"$LOG" 2>&1 &
CF_PID=$!

TUNNEL_URL=""
for _ in $(seq 1 60); do
  TUNNEL_URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)"
  if [[ -n "$TUNNEL_URL" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "Failed to obtain tunnel URL. cloudflared log:"
  cat "$LOG"
  exit 1
fi

echo "Tunnel URL: $TUNNEL_URL"

if [[ -f "$ENV_FILE" ]]; then
  if grep -q '^PUBLIC_TUNNEL_URL=' "$ENV_FILE"; then
    sed -i '' "s|^PUBLIC_TUNNEL_URL=.*|PUBLIC_TUNNEL_URL=$TUNNEL_URL|" "$ENV_FILE"
  else
    printf '\nPUBLIC_TUNNEL_URL=%s\n' "$TUNNEL_URL" >>"$ENV_FILE"
  fi
else
  printf 'PUBLIC_TUNNEL_URL=%s\n' "$TUNNEL_URL" >"$ENV_FILE"
fi

echo "Updated $ENV_FILE"
echo "Webhook base: $TUNNEL_URL/api/agentphone/webhook"
echo ""
echo "Starting Next.js dev server…"

npm run dev -- --port "$PORT"
