# ADR-021: Redis as Shared State for Multi-Instance

**Status:** accepted
**Date:** 2026-03-27

## Context

The backend has several in-memory stores (JavaScript `Map`) that work in single-instance but desynchronize in multi-instance deployments:

- **Edit lock**: two users on different instances can hold the lock simultaneously
- **Rate limiting**: per-process counters allow bypass by multiplying instances (user gets N×instances requests)
- **Snapshot interval**: duplicate snapshots generated every 10 minutes

Redis is already configured in Docker and `ioredis` is already installed (used for the Socket.IO adapter), but not used for these stores.

## Decision

Migrate edit lock, HTTP/API rate limiting, and snapshot interval tracking to Redis when `REDIS_URL` is available. Maintain automatic fallback to in-memory when Redis is not available.

- Lock: `SET NX EX` + `RPUSH`/`LPOP` for queue
- Rate limiting: `rate-limit-redis` as store for `express-rate-limit`
- Snapshot interval: simple key with 10-minute TTL
- Shared `ioredis` instance to minimize connections

## Alternatives Considered

- **PostgreSQL for locks** — rejected: adds query latency to the lock path (must be <1ms). Redis is in-memory and sub-millisecond.
- **Mandatory Redis** — rejected: many deployments are single-instance. In-memory fallback preserves setup simplicity.
- **Custom distributed stores** — rejected: reinventing what Redis already solves.

## Consequences

- Multi-instance works correctly out-of-the-box with `REDIS_URL`
- Single-instance continues working without Redis (zero config change)
- One additional dependency: `rate-limit-redis`
- Shared `ioredis` instance keeps connection count low
- If Redis goes down, automatic fallback to in-memory with a logged warning
