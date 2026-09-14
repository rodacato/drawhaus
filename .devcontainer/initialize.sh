#!/bin/sh
# Runs on the HOST before the container starts (devcontainer.json initializeCommand).
# Writes .devcontainer/.host.env, which docker-compose.yml hands to the container.
# Always exits 0: a missing gh or git must never keep the container from opening.

case "$0" in */*) cd "${0%/*}" || exit 0 ;; esac

out=.host.env
tmp=.host.env.tmp

umask 077
rm -f "$tmp"
: > "$tmp" || exit 0

if command -v gh >/dev/null 2>&1; then
  token=$(gh auth token 2>/dev/null) && [ -n "$token" ] && echo "GH_TOKEN=$token" >> "$tmp"
fi

if command -v git >/dev/null 2>&1; then
  slug=$(git config --get remote.origin.url 2>/dev/null |
    sed -E 's#^[a-z+]+://##; s#^[^@/]*@##; s#^[^:/]+(:[0-9]+)?[:/]##; s#\.git$##; s#/$##')
  case "$slug" in
    */*)
      echo "GITHUB_REPOSITORY=$slug" >> "$tmp"
      echo "GITHUB_REPOSITORY_OWNER=${slug%%/*}" >> "$tmp"
      echo "GITHUB_ACTOR=${slug%%/*}" >> "$tmp"
      ;;
  esac
fi

mv -f "$tmp" "$out" 2>/dev/null || rm -f "$tmp"
chmod 600 "$out" 2>/dev/null
exit 0
