import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { parsePlantUMLToExcalidraw } from "@drawhaus/plantuml-to-excalidraw";

/**
 * Convert Mermaid code into Excalidraw elements ready for the canvas.
 */
export async function mermaidToElements(code: string) {
  const { elements: skeletons } = await parseMermaidToExcalidraw(code);
  const elements = convertToExcalidrawElements(skeletons as any);
  return elements;
}

/**
 * Convert PlantUML code into Excalidraw elements ready for the canvas.
 */
export function plantumlToElements(code: string) {
  const { elements: skeletons, diagramType } =
    parsePlantUMLToExcalidraw(code);
  const elements = convertToExcalidrawElements(skeletons as any);
  return { elements, diagramType };
}
