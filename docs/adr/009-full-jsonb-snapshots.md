# ADR-009: Full JSONB Snapshots over Event-Sourced Diffs

**Status:** accepted
**Date:** 2026-03-19

## Context

Diagram versioning needed a persistence strategy. Options ranged from storing every change as an event to storing periodic full snapshots.

## Decision

Store **full JSONB snapshots** of elements + app_state. Auto-trigger on open, close (last editor), and interval (5+ minutes). Content hash deduplication prevents redundant snapshots.

Retention: last 10 auto-snapshots OR last 3 days (whichever keeps more). Named snapshots never purged. Max 20 named snapshots per diagram, max 5MB payload.

## Alternatives Considered

- **Event sourcing (diffs)** — rejected: complex replay logic, harder to debug, snapshot reconstruction adds latency. Storage is cheap.
- **Git-like commit history** — rejected: over-engineered for the use case. Full snapshots are simpler and restore is instant.

## Consequences

- Restore is a single row read — no replay or reconstruction needed.
- Storage grows linearly with snapshot count (mitigated by retention policy).
- Pre-restore automatic backup prevents accidental data loss.
- Offline snapshots via IndexedDB with conflict resolution on reconnect.
- Real-time `snapshot-created` events keep the snapshot panel synced across users.
