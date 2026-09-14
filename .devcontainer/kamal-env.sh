# Non-secret environment Kamal needs to render config/deploy.*.yml locally.
# Real secrets never live here: a deploy runs in GitHub Actions, which injects
# them from the "production" GitHub Environment.

: "${DRAWHAUS_ROOT:=$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -n "${DRAWHAUS_ROOT:-}" ] || return 0 2>/dev/null || exit 0

# GitHub Actions sets this in CI; locally it comes from the origin remote.
if [ -z "${GITHUB_REPOSITORY_OWNER:-}" ]; then
  _kamal_owner="$(git -C "$DRAWHAUS_ROOT" config --get remote.origin.url 2>/dev/null |
    sed -E 's#^(git@[^:]+:|https?://[^/]+/)##; s#/.*$##')"
  [ -n "$_kamal_owner" ] && export GITHUB_REPOSITORY_OWNER="$_kamal_owner"
  unset _kamal_owner
fi

if [ -r "$DRAWHAUS_ROOT/.devcontainer/local.env" ]; then
  set -a
  . "$DRAWHAUS_ROOT/.devcontainer/local.env"
  set +a
fi
