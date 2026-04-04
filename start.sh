#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Estora Guard — Lightning.ai Startup Script
# ============================================
# Usage:
#   chmod +x start.sh
#   ./start.sh          # production mode (default, port 3000)
#   ./start.sh dev      # dev mode with hot-reload (port 3000)
#   ./start.sh --port 8080  # custom port
#
# Lightning.ai port forwarding:
#   After this script starts, open the Lightning.ai "Port Forward" tab
#   and forward port 3000 (or your custom port) to get a public URL.
# ============================================

PORT=3000
MODE="production"

while [[ $# -gt 0 ]]; do
  case $1 in
    dev)
      MODE="dev"
      shift
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "========================================"
echo " Estora Guard — Lightning.ai Deploy"
echo " Mode: $MODE | Port: $PORT"
echo "========================================"

# --- 1. Ensure Node.js is available ---
if command -v node &> /dev/null; then
  echo "[✓] Node.js $(node --version) found"
else
  echo "[!] Node.js not found — installing via nodeenv..."
  pip install -q nodeenv
  nodeenv --node=20.18.0 --prebuilt .nodeenv
  source .nodeenv/bin/activate
  echo "[✓] Node.js $(node --version) installed via nodeenv"
fi

if command -v npm &> /dev/null; then
  echo "[✓] npm $(npm --version) found"
else
  echo "[✗] npm not found. Cannot continue."
  exit 1
fi

# --- 2. Check .env.local ---
if [ ! -f .env.local ]; then
  echo ""
  echo "[!] WARNING: .env.local not found."
  echo "    Copy .env.example to .env.local and fill in your keys:"
  echo "      cp .env.example .env.local"
  echo ""
fi

# --- 3. Install npm dependencies ---
echo ""
echo "[*] Installing npm dependencies..."
npm install --prefer-offline --no-audit --no-fund
echo "[✓] Dependencies installed"

# --- 4. Start the app ---
echo ""
if [ "$MODE" = "dev" ]; then
  echo "[*] Starting Next.js in dev mode on port $PORT..."
  echo "    Access via Lightning.ai port forwarding → port $PORT"
  echo ""
  PORT=$PORT npx next dev --hostname 0.0.0.0 --port "$PORT"
else
  echo "[*] Building Next.js for production..."
  npm run build
  echo "[✓] Build complete"
  echo ""
  echo "[*] Starting Next.js production server on port $PORT..."
  echo "    Access via Lightning.ai port forwarding → port $PORT"
  echo ""
  PORT=$PORT npx next start --hostname 0.0.0.0 --port "$PORT"
fi
