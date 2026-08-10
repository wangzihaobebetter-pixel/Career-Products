#!/bin/bash
# Job Tracker Pro — one-click local launch.
#
# Usage:  double-click this file in Finder, or run  ./run.sh
#         ./run.sh dev     -> dev server with hot reload (for editing the code)
#         ./run.sh test    -> type-check, build, unit tests, headless render check
#
# All data stays in your browser's localStorage on this machine. Nothing is uploaded.

set -euo pipefail
cd "$(dirname "$0")"

PORT=4173
MODE="${1:-serve}"

say() { printf "\033[1;36m%s\033[0m\n" "$1"; }
warn() { printf "\033[1;33m%s\033[0m\n" "$1"; }
die() { printf "\033[1;31m%s\033[0m\n" "$1"; exit 1; }

command -v node >/dev/null 2>&1 || die "Node.js is not installed. Get it from https://nodejs.org (LTS), then run this again."

say "Job Tracker Pro"
echo "Node $(node -v)"

if [ ! -d node_modules ]; then
  say "First run — installing dependencies (this takes a minute)…"
  npm install --no-audit --no-fund
fi

if [ "$MODE" = "test" ]; then
  say "Type-checking…";        npx tsc --noEmit
  say "Building…";             npx vite build
  say "Unit tests…";           npm test --silent
  say "Headless render test…"; node test/render.test.mjs
  # These drive the real built bundle in jsdom. Each exits non-zero on
  # failure, and `set -e` stops the run, so a broken view or a broken
  # backup cannot pass silently.
  say "View render…";          node verify-render.cjs
  say "Seed data…";            node verify-data.cjs
  say "Interactions…";         node verify-interact.cjs
  say "Action board + CSV…";   node verify-actions.cjs
  say "Backup round trip…";    node verify-backup.cjs
  say "Backup key coverage…";  node check-backup-keys.mjs
  say "Research import…";      node verify-research-import.cjs
  say "Interview prep…";       node verify-interview-prep.cjs
  say "Batch-2 question bank…"; node verify-batch2.cjs
  say "All checks passed."
  exit 0
fi

if [ "$MODE" = "dev" ]; then
  say "Starting dev server (hot reload) on http://localhost:5173"
  exec npx vite --port 5173 --open
fi

say "Building…"
npx vite build

# Free the port if a previous run is still holding it.
if lsof -ti tcp:$PORT >/dev/null 2>&1; then
  warn "Port $PORT is busy — stopping the old instance."
  lsof -ti tcp:$PORT | xargs kill -9 2>/dev/null || true
  sleep 1
fi

URL="http://localhost:$PORT/"
say "Opening $URL"
( sleep 2; open "$URL" >/dev/null 2>&1 || true ) &

echo
echo "  Your data is stored locally in this browser profile."
echo "  Press Ctrl+C in this window to stop the server."
echo
exec npx vite preview --port $PORT --host
