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

echo "[post-install] Installing Kamal for the read-only deploy commands..."
# Deploys still run in CI — nothing installed here holds a secret. Version tracks
# .github/workflows/build-push.yml's KAMAL_VERSION.
if ! gem list -i '^kamal$' >/dev/null 2>&1; then
  gem install kamal -v '~> 2.7' --no-document
fi

# Load the non-secret Kamal environment in every shell. Idempotent across rebuilds.
for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
  [ -f "$rc" ] || continue
  grep -q 'devcontainer/kamal-env.sh' "$rc" && continue
  {
    echo ''
    echo 'export DRAWHAUS_ROOT="/workspaces/drawhaus"'
    echo '[ -r "$DRAWHAUS_ROOT/.devcontainer/kamal-env.sh" ] && . "$DRAWHAUS_ROOT/.devcontainer/kamal-env.sh"'
  } >> "$rc"
done
