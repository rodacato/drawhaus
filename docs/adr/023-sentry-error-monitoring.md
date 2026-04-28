# ADR-023: Sentry for Error Monitoring (Backend + Frontend)

**Status:** accepted
**Date:** 2026-04-28
**Supersedes:** Honeybadger integration (v0.7.x)

## Context

Drawhaus shipped with Honeybadger as the optional error sink for the backend (`@honeybadger-io/js`, `Honeybadger.notify` in async route handlers, `Honeybadger.errorHandler` express middleware). The frontend had no error reporting at all — UI errors were lost unless they happened to bubble to the server.

Two pain points motivated the swap:

1. **No frontend coverage.** Excalidraw + the multi-route SPA produces far more user-visible errors than the backend, but they were invisible to operators.
2. **Honeybadger's pricing tier became a tax** for a personal/small-team tool that already self-hosts the rest of its stack. Sentry's free tier covers the volumes Drawhaus produces and supports both Node and React from the same vendor.

## Decision

Adopt Sentry as the single error monitoring vendor across backend and frontend.

### Backend (`@sentry/node`)
- `Sentry.init` runs at boot guarded by `if (config.sentryDsn)` — no DSN → SDK is a no-op.
- `Sentry.setupExpressErrorHandler(app)` replaces `Honeybadger.errorHandler` after all routes are mounted.
- The two manual notifications inside `asyncRoute` / `asyncPublicRoute` use `Sentry.captureException(err, { extra: { method, url } })`.
- `beforeSend` strips `request.data` and `request.cookies` to keep PII out of events.

### Frontend (`@sentry/react`)
- `Sentry.init` runs in `main.tsx` guarded by `import.meta.env.VITE_SENTRY_DSN` — empty DSN → bundle ships with the SDK loaded but inactive.
- No `ErrorBoundary` wrapper at the root: Drawhaus already uses `react-error-boundary` for scoped fallbacks, and Sentry's auto-instrumentation captures `window.onerror` and `unhandledrejection` without help. Per-feature boundaries can call `Sentry.captureException` from their `onError` if they want to.
- `@sentry/vite-plugin` uploads source maps at build time, gated on `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` all being set; missing any one drops the plugin silently so local builds keep working.

### Deploy wiring
- Secrets in the GitHub `production` environment: `SENTRY_DSN`, `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`.
- Vars: `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_ORG`, `VITE_SENTRY_ENVIRONMENT` (defaulted in the workflow).
- `SENTRY_RELEASE` and `VITE_SENTRY_RELEASE` are set to `${{ github.sha }}` by the workflow so events tie back to a commit and source maps line up with the release.
- `SENTRY_TRACES_SAMPLE_RATE` defaults to `0` — performance tracing stays off until we explicitly opt in.

## Alternatives Considered

- **Stay on Honeybadger and add `@honeybadger-io/react`.** Rejected: still leaves us paying two vendors' worth of mental overhead, and the React adapter is less battle-tested than Sentry's.
- **Self-host GlitchTip (Sentry-compatible).** Rejected for now: adds another service to operate. Sentry SaaS free tier (5K errors/month) is well within Drawhaus's expected volume.
- **Pino logs only, no error tracker.** Rejected: stack traces in logs are noisy and there's no aggregation, fingerprinting, or release tagging — operators end up grep-ing log files.
- **Dojo's `Composite logger` + `ErrorReporterPort` pattern.** Considered but deemed over-engineered for Drawhaus's current size — direct `Sentry.captureException` calls match the existing code style. We can refactor if we ever add a second sink.

## Consequences

- Frontend errors surface in the same dashboard as backend errors, with releases tied to commits.
- Source maps make production stack traces readable without shipping unminified JS.
- Operators no longer need a Honeybadger account or its API key.
- One more env var category to manage (`SENTRY_*`, `VITE_SENTRY_*`), partially offset by removing `HONEYBADGER_API_KEY`.
- Boot-time configuration only: changing the DSN requires a redeploy. Acceptable — DSNs rotate rarely and the vendor is now part of infrastructure, not an admin-UI integration.

## Security

- `sendDefaultPii: false` on both SDKs, plus a `beforeSend` hook on the backend that drops request bodies and cookies before transmission.
- Auth token has minimum scopes (`project:releases`, `org:read`) and is consumed only by the build container.
