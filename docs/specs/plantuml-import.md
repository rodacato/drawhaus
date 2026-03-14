# Diagram as Code — PlantUML Import (Phase 2)

> Custom PlantUML → Excalidraw converter that produces editable elements. Extends the existing Mermaid import panel.

## Why

PlantUML is widely used in enterprise docs and Java ecosystems. A custom converter produces real Excalidraw elements (rectangles, arrows, text) that users can edit, move, and style — unlike a Kroki.io SVG embed which is just a static image.

## Architecture

Mirrors `@excalidraw/mermaid-to-excalidraw`:

```
plantuml-parser.parse(text)
  → PlantUML AST (classes, relations, messages, etc.)
    → mapper per diagram type (class.ts, sequence.ts, activity.ts)
      → ExcalidrawElementSkeleton[] (rectangles, arrows, text with positions)
        → convertToExcalidrawElements() (from @excalidraw/excalidraw)
          → Full ExcalidrawElement[] ready for canvas
```

## Public Interface

```typescript
// frontend/src/lib/diagram-code/plantuml-to-excalidraw/index.ts
export async function parsePlantUMLToExcalidraw(
  definition: string
): Promise<{ elements: ExcalidrawElementSkeleton[]; files?: BinaryFiles }>
```

## Supported Diagram Types

| PlantUML Type | Layout | Excalidraw Elements Generated |
|---------------|--------|-------------------------------|
| **Class** | dagre (left→right) | Rectangles with sections (name, attributes, methods) + arrows with relation labels |
| **Sequence** | Custom linear | Actor rectangles top, vertical lifelines, horizontal message arrows |
| **Activity** | dagre (top→down) | Rounded rectangles + diamonds (decisions) + arrows |
| Others | Kroki.io fallback | Embedded SVG image (not editable, with "Rendered via kroki.io" disclaimer) |

## Dependencies to Install

| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| `plantuml-parser` | 0.4.0 | Parse PlantUML text → structured AST | ~15KB |
| `dagre` | 0.8.5 | Directed graph layout engine (already used internally by mermaid) | ~30KB |
| `@types/dagre` | latest | TypeScript types for dagre | dev dep |

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/lib/diagram-code/plantuml-to-excalidraw/index.ts` | Entry point: detect diagram type, dispatch to mapper |
| `frontend/src/lib/diagram-code/plantuml-to-excalidraw/class.ts` | Class diagram AST → ExcalidrawElementSkeleton[] |
| `frontend/src/lib/diagram-code/plantuml-to-excalidraw/sequence.ts` | Sequence diagram AST → ExcalidrawElementSkeleton[] |
| `frontend/src/lib/diagram-code/plantuml-to-excalidraw/activity.ts` | Activity diagram AST → ExcalidrawElementSkeleton[] |
| `frontend/src/lib/diagram-code/plantuml-to-excalidraw/layout.ts` | dagre wrapper: nodes + edges → positioned (x, y, width, height) |
| `frontend/src/lib/diagram-code/plantuml-to-excalidraw/elements.ts` | Helpers: create rect, arrow, text, diamond skeletons |
| `frontend/src/lib/diagram-code/plantuml-renderer.ts` | PlantUML preview: custom render or Kroki.io fallback |

## Changes to CodeImportPanel

- Add "PlantUML" to format selector dropdown
- Auto-detection: `@startuml` → PlantUML, `graph`/`flowchart`/`sequenceDiagram` → Mermaid
- Preview: custom render for supported types, Kroki.io fallback for unsupported

## Panel Notes

- Rafa: start with Mermaid import only (done) — PlantUML is Phase 2
- Maya: "diagram as code" is a strong positioning message for dev audience
- Leo: sidebar panel is the right UX — same pattern users already know
