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

mkdir -p "$out/brand/assets"
node "$repo/site/build-brand.mjs" "$out/brand/assets"
cp "$repo/docs/branding/generated/"*.png "$repo/docs/branding/generated/raster-sources.json" "$out/brand/assets/"
cp "$repo/docs/branding/generated/favicon.png" "$out/img/favicon.png"
cp "$repo/site/brand/index.html" "$repo/site/brand/styles.css" "$repo/site/brand/guide.js" "$out/brand/"
cp "$shots/screenshot-code-import-mermaid.png" "$out/img/code-import.png"
cp "$shots/screenshot-admin.png" "$out/img/admin.png"
cp "$shots/screenshot-collab.png" "$out/img/collab.png"
cp "$shots/screenshot-dashboard.png" "$out/img/dashboard.png"

mkdir -p "$out/brand/logos/assets"
cp "$repo/site/brand/logos/index.html" "$repo/site/brand/logos/styles.css" "$out/brand/logos/"
for name in open-d drawing-house shared-frame; do
  cp "$repo/docs/branding/proposals/$name.svg" "$out/brand/logos/assets/$name.svg"
  sed 's/#111827/#F8FAF3/g' "$repo/docs/branding/proposals/$name.svg" \
    > "$out/brand/logos/assets/$name-light.svg"
done

for name in canvas-stroke modular-d drawn-dh; do
  source="$repo/docs/branding/proposals/$name.svg"
  cp "$source" "$out/brand/logos/assets/$name.svg"
  sed -E 's/#[[:xdigit:]]{6}/#111827/g' "$source" \
    > "$out/brand/logos/assets/$name-mono.svg"
  sed -E 's/#[[:xdigit:]]{6}/#F8FAF3/g' "$source" \
    > "$out/brand/logos/assets/$name-light.svg"
done

for name in freehand-dh signature-dh looped-d; do
  source="$repo/docs/branding/proposals/$name.svg"
  cp "$source" "$out/brand/logos/assets/$name.svg"
  sed 's/#2F7058/#111827/g' "$source" > "$out/brand/logos/assets/$name-mono.svg"
  sed 's/#2F7058/#A6D9BB/g' "$source" > "$out/brand/logos/assets/$name-light.svg"
done

mkdir -p "$out/brand/colors/assets"
cp "$repo/site/brand/colors/"*.html "$repo/site/brand/colors/"*.css \
  "$repo/site/brand/colors/"*.js "$out/brand/colors/"
node "$repo/site/build-color-assets.mjs" "$out/brand/colors/assets"

echo "built $out"
