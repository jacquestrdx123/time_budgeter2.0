#!/usr/bin/env bash
# Run the FastAPI app from the project root so that the 'backend' package is importable.
# Uses .venv in the project root if present (required for SQLAlchemy 2.x on deployment).
# Usage: from anywhere, run   ./backend/run.sh [uvicorn args...]
# Example: ./backend/run.sh --host 0.0.0.0 --port 8005
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
if [ -d "$ROOT_DIR/.venv" ]; then
  exec "$ROOT_DIR/.venv/bin/python" -m uvicorn backend.main:app "$@"
else
  exec python3 -m uvicorn backend.main:app "$@"
fi
