# ADR-015: Custom PlantUML Converter over Kroki

**Status:** accepted
**Date:** 2026-03-09

## Context

PlantUML diagrams could be rendered via Kroki (external service that returns SVG) or parsed locally into editable Excalidraw elements.

## Decision

Build a **custom PlantUML parser and converter** using PEG grammars. Each diagram type gets its own grammar, AST types, and converter module. Extract as `@drawhaus/plantuml-to-excalidraw` package.

## Alternatives Considered

- **Kroki embed** — rejected: produces static SVG images, not editable elements. Users can't move, restyle, or modify imported shapes. Also requires external service dependency (breaks self-hosted principle).
- **PlantUML Java server** — rejected: heavy dependency, still produces images not elements.

## Consequences

- Users can move, style, and edit every imported element individually.
- No external service dependency — parsing happens client-side.
- Each diagram type (class, object, use case, sequence, etc.) requires separate PEG grammar work.
- Difficulty varies by type: object (2/10) to timing (9/10).
- `MAX_INPUT_LENGTH` check (8-16KB) prevents DoS via PEG grammar.
- Parser (PEG → AST) and converter (AST → elements) are cleanly separated.
- Package has zero dependency on `@excalidraw/excalidraw` — consumers handle rendering.
