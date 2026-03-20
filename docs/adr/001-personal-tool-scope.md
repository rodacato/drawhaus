# ADR-001: Personal Tool Scope

**Status:** accepted
**Date:** 2025-12-01

## Context

Excalidraw is an excellent open-source editor, and Excalidraw+ offers a managed SaaS. Drawhaus needed to decide whether to build a competing product or a personal infrastructure layer around the existing editor.

## Decision

Build Drawhaus as a **personal and small-team tool**, not a product or enterprise platform. The goal is to replace a $6/mo subscription, not to compete with Excalidraw+.

## Alternatives Considered

- **SaaS product** — rejected: saturated market, Excalidraw+ already covers this well.
- **Enterprise self-hosted** — rejected: SSO, SAML, compliance audit trails add complexity with no personal value.

## Consequences

- Feature scope filtered through "would I use this myself?"
- No SSO/SAML, no multi-region, no enterprise compliance features.
- Architecture stays proportional to single-VPS deployment.
- Workspaces and sharing are designed for small teams (5 members max default).
