#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON=python3.11
BACKEND_PORT=8000
FRONTEND_PORT=8081

cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  echo "All servers stopped."
  exit 0
}
trap cleanup INT TERM

# Kill anything already on the ports
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
sleep 1

# --- Backend (FastAPI + Uvicorn) ---
echo "Starting backend on http://localhost:$BACKEND_PORT ..."
cd "$ROOT_DIR"
$PYTHON -m uvicorn backend.main:app --reload --port $BACKEND_PORT &
BACKEND_PID=$!

# --- Frontend (Vite) ---
echo "Starting frontend on http://localhost:$FRONTEND_PORT ..."
cd "$ROOT_DIR/frontend"
npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  TimeBudget is starting up"
echo "  Backend  → http://localhost:$BACKEND_PORT"
echo "  Frontend → http://localhost:$FRONTEND_PORT"
echo "  Press Ctrl+C to stop both servers"
echo "========================================="
echo ""

wait
