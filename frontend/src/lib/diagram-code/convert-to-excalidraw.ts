import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

/**
 * Convert Mermaid code into Excalidraw elements ready for the canvas.
 */
export async function mermaidToElements(code: string) {
  const { elements: skeletons } = await parseMermaidToExcalidraw(code);
  const elements = convertToExcalidrawElements(skeletons as any);
  return elements;
}
