import type { ExcalidrawElementSkeleton, PlantUMLConfig, PlantUMLToExcalidrawResult } from "./types.js";
import {
  parsePlantUML,
  detectDiagramType,
  PlantUMLParseError,
  PlantUMLUnsupportedError,
} from "./parser/index.js";
import type { DiagramType } from "./parser/types.js";
import { mapClassDiagram } from "./converter/class.js";
import { resetIdCounter } from "./elements.js";

// ── Re-exports ─────────────────────────────────────────────────

export {
  PlantUMLParseError,
  PlantUMLUnsupportedError,
} from "./parser/types.js";

export type {
  DiagramType,
  DiagramAST,
  ClassDiagramAST,
  ClassEntity,
  ClassMember,
  ClassRelation,
  ClassRelationType,
} from "./parser/types.js";

export type {
  ExcalidrawElementSkeleton,
  PlantUMLConfig,
  PlantUMLToExcalidrawResult,
} from "./types.js";

// ── Public API ─────────────────────────────────────────────────

/**
 * Parse PlantUML code and convert it to Excalidraw element skeletons.
 *
 * Follows the same adapter pattern as `@excalidraw/mermaid-to-excalidraw`:
 * `(definition, config?) → { elements, files?, diagramType }`
 *
 * Supported diagram types:
 * - Class diagrams (class, interface, enum, abstract class, relations)
 *
 * For unsupported types, throws PlantUMLUnsupportedError.
 * For invalid syntax, throws PlantUMLParseError with line/column info.
 */
export function parsePlantUMLToExcalidraw(
  definition: string,
  _config?: PlantUMLConfig,
): PlantUMLToExcalidrawResult {
  const trimmed = definition.trim();
  if (!trimmed) {
    return { elements: [], diagramType: "unknown" };
  }

  const diagramType = detectDiagramType(trimmed);

  // Reset element ID counter for deterministic output
  resetIdCounter();

  const ast = parsePlantUML(trimmed);

  let elements: ExcalidrawElementSkeleton[] = [];

  switch (ast.type) {
    case "class":
      elements = mapClassDiagram(ast);
      break;
    default:
      // Sequence and activity will be added in future phases
      throw new PlantUMLUnsupportedError(ast.type);
  }

  return {
    elements,
    diagramType,
  };
}
