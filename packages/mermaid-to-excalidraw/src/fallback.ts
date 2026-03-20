import { parseMermaidToExcalidraw as excalidrawParse } from "@excalidraw/mermaid-to-excalidraw";
import type { MermaidConfig, MermaidToExcalidrawResult } from "./types.js";
import { detectDiagramType } from "./detect.js";

/**
 * Fallback converter that delegates to @excalidraw/mermaid-to-excalidraw.
 * Adds diagramType to the result.
 */
export async function fallbackParse(
  definition: string,
  config?: MermaidConfig,
): Promise<MermaidToExcalidrawResult> {
  const result = await excalidrawParse(definition, config);
  const diagramType = detectDiagramType(definition);

  return {
    elements: result.elements as MermaidToExcalidrawResult["elements"],
    files: result.files as MermaidToExcalidrawResult["files"],
    diagramType,
  };
}
