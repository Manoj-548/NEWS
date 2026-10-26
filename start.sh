#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. On Ubuntu run:"
  echo "  sudo apt update && sudo apt install -y nodejs npm"
  exit 1
fi
echo "AI NEWS STUDIO  ->  http://localhost:3000"
echo "Keep this terminal open. Ctrl+C to stop."
exec node server.js
