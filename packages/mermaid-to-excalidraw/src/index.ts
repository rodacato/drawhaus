/**
 * @drawhaus/mermaid-to-excalidraw
 *
 * Drop-in replacement for @excalidraw/mermaid-to-excalidraw.
 * Routes to custom converters when available, falls back to excalidraw's
 * implementation for unsupported types.
 *
 * Follows the same adapter pattern as @drawhaus/plantuml-to-excalidraw:
 *   (definition, config?) → { elements, files?, diagramType }
 */

export { detectDiagramType } from "./detect.js";
export { registerConverter, hasConverter, listConverters } from "./converter/registry.js";
export type {
  ExcalidrawElementSkeleton,
  MermaidToExcalidrawResult,
  MermaidConfig,
  DiagramConverter,
  BinaryFiles,
} from "./types.js";

import type { MermaidConfig, MermaidToExcalidrawResult } from "./types.js";
import { detectDiagramType } from "./detect.js";
import { getConverter, registerConverter } from "./converter/registry.js";
import { fallbackParse } from "./fallback.js";

// ── Register built-in custom converters ─────────────────────────
import { convertClassDiagram } from "./converter/class.js";
import { convertFlowchart } from "./converter/flowchart.js";
import { convertSequenceDiagram } from "./converter/sequence.js";
import { convertERDiagram } from "./converter/er.js";
import { convertStateDiagram } from "./converter/state.js";
registerConverter("classDiagram", convertClassDiagram);
registerConverter("flowchart", convertFlowchart);
registerConverter("sequenceDiagram", convertSequenceDiagram);
registerConverter("erDiagram", convertERDiagram);
registerConverter("stateDiagram", convertStateDiagram);

/**
 * Parse a Mermaid diagram definition and convert it to Excalidraw elements.
 *
 * If a custom converter is registered for the detected diagram type, it is
 * used. Otherwise, delegates to @excalidraw/mermaid-to-excalidraw.
 *
 * If the custom converter throws, automatically falls back to excalidraw's
 * implementation so the user always sees a result.
 */
export async function parseMermaidToExcalidraw(
  definition: string,
  config?: MermaidConfig,
): Promise<MermaidToExcalidrawResult> {
  const type = detectDiagramType(definition);
  const customConverter = getConverter(type);

  if (customConverter) {
    try {
      return await customConverter(definition, config);
    } catch {
      // Custom converter failed — fall back silently
      return fallbackParse(definition, config);
    }
  }

  return fallbackParse(definition, config);
}
