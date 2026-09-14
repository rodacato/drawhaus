#!/usr/bin/env bash
set -euo pipefail

echo "[post-create] Installing workspace dependencies..."
npm install

echo "[post-create] Preparing E2E: the drawhaus_e2e database and Chromium..."
export PGPASSWORD=drawhaus
for _ in $(seq 60); do pg_isready -h db -U drawhaus -q && break; sleep 1; done
if ! psql -h db -U drawhaus -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'drawhaus_e2e'" | grep -q 1; then
  createdb -h db -U drawhaus drawhaus_e2e
fi
unset PGPASSWORD
(cd e2e && npx playwright install --with-deps chromium)

echo "[post-create] Verifying toolchain..."
node -v
npm -v
gh --version | head -n 1
git --version
psql --version | head -n 1

echo "[post-create] Installing Kamal for the read-only deploy commands..."
# Deploys still run in CI — nothing installed here holds a secret. Version tracks
# .github/workflows/deploy.yml's KAMAL_VERSION.
if ! gem list -i '^kamal$' -v 2.12.0 >/dev/null 2>&1; then
  gem install kamal -v 2.12.0 --no-document
fi
