import type { ExcalidrawElementSkeleton, PlantUMLConfig, PlantUMLToExcalidrawResult } from "./types.js";
import {
  parsePlantUML,
  PlantUMLParseError,
  PlantUMLUnsupportedError,
} from "./parser/index.js";
import { mapClassDiagram } from "./converter/class.js";
import { mapObjectDiagram } from "./converter/object.js";
import { mapUseCaseDiagram } from "./converter/usecase.js";
import { resetIdCounter } from "./elements.js";
import { resolveTheme } from "./theme/index.js";

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
  ObjectDiagramAST,
  ObjectEntity,
  ObjectField,
  ObjectRelation,
  UseCaseDiagramAST,
  UseCaseActor,
  UseCase,
  UseCaseBoundary,
  UseCaseRelation,
  UseCaseRelationType,
} from "./parser/types.js";

export type {
  ExcalidrawElementSkeleton,
  PlantUMLConfig,
  PlantUMLToExcalidrawResult,
} from "./types.js";

export type {
  DiagramTheme,
  ShapeStyle,
  TextStyle,
  ArrowStyle,
  StrokeStyle,
} from "./theme/types.js";

export { DEFAULT_THEME, resolveTheme } from "./theme/index.js";

// ── Public API ─────────────────────────────────────────────────

/**
 * Parse PlantUML code and convert it to Excalidraw element skeletons.
 *
 * Follows the same adapter pattern as `@excalidraw/mermaid-to-excalidraw`:
 * `(definition, config?) → { elements, files?, diagramType }`
 *
 * Supported diagram types:
 * - Class diagrams (class, interface, enum, abstract class, relations)
 * - Object diagrams (object, map, relations)
 * - Use case diagrams (actors, use cases, boundaries, relations)
 *
 * For unsupported types, throws PlantUMLUnsupportedError.
 * For invalid syntax, throws PlantUMLParseError with line/column info.
 */
export function parsePlantUMLToExcalidraw(
  definition: string,
  config?: PlantUMLConfig,
): PlantUMLToExcalidrawResult {
  const trimmed = definition.trim();
  if (!trimmed) {
    return { elements: [], diagramType: "unknown" };
  }

  const MAX_INPUT_LENGTH = 16_384;
  if (trimmed.length > MAX_INPUT_LENGTH) {
    throw new PlantUMLParseError(
      `Input too large (${trimmed.length} chars, max ${MAX_INPUT_LENGTH})`,
      0, 0, [], null,
    );
  }

  // Resolve theme: merge user overrides with defaults
  const theme = resolveTheme(config?.theme);

  // Reset element ID counter for deterministic output
  resetIdCounter();

  // parsePlantUML uses detection + fallback: if the primary parser
  // fails, it tries alternative parsers automatically.
  const ast = parsePlantUML(trimmed);

  let elements: ExcalidrawElementSkeleton[] = [];

  switch (ast.type) {
    case "class":
      elements = mapClassDiagram(ast, theme);
      break;
    case "object":
      elements = mapObjectDiagram(ast, theme);
      break;
    case "usecase":
      elements = mapUseCaseDiagram(ast, theme);
      break;
    default:
      throw new PlantUMLUnsupportedError(ast.type);
  }

  return {
    elements,
    // Use AST type as source of truth — may differ from heuristic
    // detection if fallback kicked in.
    diagramType: ast.type,
  };
}
