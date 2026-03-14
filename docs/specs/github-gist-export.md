# GitHub Gist Export

> Export a diagram as a `.excalidraw` file to a GitHub Gist (public or secret).

## Why

Developers already share code via Gists. Sharing diagrams the same way is natural. Public gists with "Made with Drawhaus" link = free awareness.

## Auth

Per-user GitHub PAT with `gist` scope, stored encrypted with existing `ENCRYPTION_KEY` infra. NOT OAuth, NOT instance-wide token. User manages their own token.

**Dependency**: Needs per-user encrypted secrets — either a new `user_settings` table or extend `integration_secrets` with `user_id` column.

## UX Flow

1. "Share as Gist" button in board toolbar
2. Modal with: name field, public/secret toggle
3. Submit → POST to `api.github.com/gists` with JSON payload
4. Success → copy URL, show link
5. Import: paste Gist URL in import dialog (optional)

## Implementation

- One backend endpoint (proxy to GitHub API with user's PAT)
- One frontend modal component
- Handle `api.github.com` unreachable gracefully

## Panel Notes

- Nadia: PAT must be per-user, not global admin token. Store encrypted with existing ENCRYPTION_KEY infra
- Rafa: technically trivial — POST to `api.github.com/gists` with JSON payload
- Maya: "could" not "must" — not a retention driver, but low effort
- Ethan: distribution value if gists link back to Drawhaus
