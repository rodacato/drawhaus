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

echo "[post-install] Setting up Claude Code config..."
CLAUDE_PROJECT_DIR="$(pwd)/.claude"
CLAUDE_HOME="/home/vscode/.claude"

mkdir -p "$CLAUDE_HOME"

if [ -d "$CLAUDE_PROJECT_DIR" ]; then
  cp -rn "$CLAUDE_PROJECT_DIR/." "$CLAUDE_HOME/"
  echo "[post-install] Claude config copied from project."
else
  echo "[post-install] No .claude in project, created empty ~/.claude."
fi