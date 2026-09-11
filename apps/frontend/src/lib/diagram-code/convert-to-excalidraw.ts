import { parsePlantUMLToExcalidraw } from "@drawhaus/plantuml-to-excalidraw";

// Excalidraw and the Mermaid parser are imported on demand: a static import here would
// pull both into every chunk that reaches the code-import panel.
async function convertSkeletons(skeletons: unknown) {
  const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
  return convertToExcalidrawElements(skeletons as any);
}

/**
 * Convert Mermaid code into Excalidraw elements ready for the canvas.
 */
export async function mermaidToElements(code: string) {
  const { parseMermaidToExcalidraw } = await import("@drawhaus/mermaid-to-excalidraw");
  const { elements: skeletons } = await parseMermaidToExcalidraw(code);
  return convertSkeletons(skeletons);
}

/**
 * Convert PlantUML code into Excalidraw elements ready for the canvas.
 */
export async function plantumlToElements(code: string) {
  const { elements: skeletons, diagramType } = parsePlantUMLToExcalidraw(code);
  return { elements: await convertSkeletons(skeletons), diagramType };
}
