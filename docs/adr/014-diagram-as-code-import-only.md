# ADR-014: Diagram as Code — Import Only

**Status:** accepted
**Date:** 2026-03-09

## Context

Diagram-as-code support (Mermaid, PlantUML) could work in two directions: text → diagram (import) or diagram → text (export). Bidirectional round-tripping is significantly more complex.

## Decision

Support **import only**: text → editable Excalidraw elements. No bidirectional export (canvas → text).

- Mermaid: live SVG preview with replace/append toggle.
- PlantUML: custom PEG parser → AST → Excalidraw elements (editable, not static images).

## Alternatives Considered

- **Bidirectional (round-trip)** — rejected: Excalidraw elements don't map cleanly back to text DSLs. Lossy conversion would frustrate users. Massive scope.
- **Embed static images (Kroki)** — rejected for PlantUML: users can't move/style/edit imported elements. Kroki kept as fallback for unsupported diagram types.
- **Native code editor in canvas** — rejected: scope creep, Excalidraw is the editor.

## Consequences

- Import panel in board sidebar: paste code, preview, add to canvas.
- Imported elements are first-class Excalidraw elements — fully editable.
- PlantUML converter extracted as `@drawhaus/plantuml-to-excalidraw` package.
- Each PlantUML diagram type has its own PEG grammar, AST types, and converter.
- dagre handles graph-based layouts; custom engines for timeline/waveform types.
