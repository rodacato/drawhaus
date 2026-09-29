#!/usr/bin/env bash
# Assembles site/_site/ — screenshots are copied from the app at build time so they
# cannot drift from the ones Playwright regenerates.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
out="$repo/site/_site"
shots="$repo/apps/frontend/public/screenshots"

rm -rf "$out"
mkdir -p "$out/img"

cp "$repo/site/index.html" "$repo/site/styles.css" "$out/"
touch "$out/.nojekyll"

cp "$repo/docs/branding/favicon_32.png" "$out/img/favicon.png"
cp "$shots/screenshot-code-import-mermaid.png" "$out/img/code-import-mermaid.png"
cp "$shots/screenshot-admin.png" "$out/img/admin.png"
cp "$shots/screenshot-collab.png" "$out/img/collab.png"
cp "$shots/screenshot-dashboard.png" "$out/img/dashboard.png"

echo "built $out"
