#!/usr/bin/env bash
set -euo pipefail

echo "[post-install] Installing workspace dependencies..."
npm install

echo "[post-install] Verifying toolchain..."
node -v
npm -v
gh --version | head -n 1
git --version
psql --version | head -n 1
