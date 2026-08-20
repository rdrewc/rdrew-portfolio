#!/usr/bin/env bash
# Serve Games Dashboard locally — designers: run ./start-prototype.sh then open http://localhost:8080
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
PORT="${PORT:-8080}"
echo "Games Dashboard — serving $ROOT"
echo "Open http://localhost:$PORT"
echo "Press Ctrl+C to stop."
exec python3 -m http.server "$PORT"
