#!/bin/bash
# ============================================================
# Job Tracker Pro — one-click local launcher
# Usage:  ./run.sh        (starts dev server + opens browser)
#         ./run.sh --build (build production bundle instead)
# ============================================================
set -e
cd "$(dirname "$0")"

echo "🗂 Job Tracker Pro — local launcher"
echo "=================================="

# 1. Install deps if missing
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies (first run)…"
  npm install
fi

# 2. Build mode
if [ "$1" = "--build" ] || [ "$1" = "build" ]; then
  echo "🏗  Building production bundle…"
  npm run build
  echo "✅ Build complete → dist/"
  echo "   Deploy dist/ to any static host, or run: npm run preview"
  exit 0
fi

# 3. Dev mode: start server + open browser
echo "🚀 Starting dev server at http://localhost:5173"
echo "   Press Ctrl+C to stop."

# Open browser after a short delay (works on macOS)
( sleep 2 && open "http://localhost:5173" ) &

npm run dev
