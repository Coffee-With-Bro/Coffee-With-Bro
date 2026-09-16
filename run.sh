#!/usr/bin/env bash
# Coffee With Bro — Multi-service runner for Git Bash / WSL / Linux / macOS
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    exit 1
fi

node scripts/start-both.js
