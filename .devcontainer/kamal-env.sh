# Non-secret environment Kamal needs to render config/deploy.*.yml locally.
# Real secrets never live here: a deploy runs in GitHub Actions, which injects
# them from the "production" GitHub Environment.

: "${DRAWHAUS_ROOT:=$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -n "${DRAWHAUS_ROOT:-}" ] || return 0 2>/dev/null || exit 0

if [ -r "$DRAWHAUS_ROOT/.devcontainer/local.env" ]; then
  set -a
  . "$DRAWHAUS_ROOT/.devcontainer/local.env"
  set +a
fi
