import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import {
  parsePlantUML,
  detectDiagramType,
  PlantUMLParseError,
  PlantUMLUnsupportedError,
} from "../plantuml-parser";
import type { DiagramType } from "../plantuml-parser";
import { mapClassDiagram } from "./class";
import { resetIdCounter } from "./elements";

export {
  PlantUMLParseError,
  PlantUMLUnsupportedError,
} from "../plantuml-parser";

export interface PlantUMLResult {
  elements: ExcalidrawElementSkeleton[];
  diagramType: DiagramType;
  /** true if the diagram was rendered as a fallback image instead of editable elements */
  isFallback: boolean;
}

/**
 * Parse PlantUML code and convert it to Excalidraw element skeletons.
 *
 * Supported diagram types:
 * - Class diagrams (class, interface, enum, abstract class, relations)
 *
 * For unsupported types, throws PlantUMLUnsupportedError.
 * For invalid syntax, throws PlantUMLParseError with line/column info.
 */
export function parsePlantUMLToExcalidraw(
  definition: string,
): PlantUMLResult {
  const trimmed = definition.trim();
  if (!trimmed) {
    return { elements: [], diagramType: "unknown", isFallback: false };
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
    isFallback: false,
  };
}
