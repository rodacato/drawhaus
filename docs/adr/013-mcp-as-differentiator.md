# ADR-013: MCP Server as Key Differentiator

**Status:** accepted
**Date:** 2026-03-15

## Context

Drawhaus needed a unique angle beyond "self-hosted Excalidraw." AI coding assistants (Claude Code, Cursor, Windsurf) are increasingly part of developer workflows but can't create or manage diagrams.

## Decision

Build an **MCP server** (`@drawhaus/mcp`) as a first-class feature, enabling AI agents to create, read, update, and delete diagrams via the Model Context Protocol.

Support with a **helpers package** (`@drawhaus/helpers`) providing element builders, dagre layout engine, arrow routing, element validator, and a curated Excalidraw spec for LLMs.

## Alternatives Considered

- **REST API only** — implemented as foundation, but MCP provides a richer agent experience (prompts, resources, tools).
- **Embed in the editor (AI sidebar)** — deferred to later: MCP is the agent-native approach, UI assist can build on top.

## Consequences

- MCP server is a standalone npm package, usable with any MCP-compatible client.
- 5 tools (CRUD + validate), 2 resources, 4 prompts with curated specs.
- `@drawhaus/helpers` is framework-agnostic, usable by MCP, CLI, and backend.
- Defense in depth: element validation in MCP (client-side) AND backend `/v1/` routes (server-side).
- `created_via` column tracks diagram origin (UI vs API vs MCP).
