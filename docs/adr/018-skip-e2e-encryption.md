# ADR-018: Skip End-to-End Encryption

**Status:** accepted
**Date:** 2026-01-15

## Context

E2EE would encrypt diagram content client-side so the server never sees plaintext. This is a common feature request for collaboration tools.

## Decision

**Do not implement E2EE.** Self-hosted deployment means the user owns the server and the database — the threat model doesn't justify the complexity.

## Alternatives Considered

- **Web Crypto API client-side encryption** — rejected: breaks real-time collaboration merge logic. The server needs to see element state to resolve conflicts. Would require per-diagram keys, key exchange protocol for shared diagrams, and rewriting the collab layer to merge encrypted payloads blindly (or decrypt server-side, defeating the purpose).

## Consequences

- Diagram data is stored as plaintext JSONB in PostgreSQL.
- Real-time collaboration works with simple element-level merging.
- Snapshot system can inspect and deduplicate content.
- Integration secrets (Google OAuth, Resend, API keys) ARE encrypted at rest (AES-256-GCM) — different concern, different threat model.
- **Revisit if:** multi-tenant hosting with untrusted tenants sharing the same instance.
