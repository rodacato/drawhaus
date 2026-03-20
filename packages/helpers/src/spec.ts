import { DIAGRAM_STYLES, type DiagramType } from "./defaults.js";

export const EXCALIDRAW_SPEC = {
  elementTypes: ["rectangle", "text", "arrow", "line", "diamond", "ellipse"] as const,

  commonFields: {
    id: "Unique string identifier (use descriptive names like 'table-users', 'arrow-fk-1')",
    type: "Element type: rectangle | text | arrow | line | diamond | ellipse",
    x: "X position (top-left corner). Range: -50000 to 50000",
    y: "Y position (top-left corner). Range: -50000 to 50000",
    strokeColor: "Border/text color as hex (default: '#1e1e1e')",
    backgroundColor: "Fill color as hex (default: 'transparent')",
    fillStyle: "'solid' | 'hachure' | 'cross-hatch' (default: 'solid')",
    strokeWidth: "Border width in pixels (default: 2, range: 0.5-10)",
    strokeStyle: "'solid' | 'dashed' | 'dotted' (default: 'solid')",
    roughness: "0 = sharp/clean, 1 = hand-drawn look (default: 1)",
    opacity: "0-100 (default: 100)",
    roundness: "{ type: 3 } for rounded corners, null for sharp",
  },

  shapeFields: {
    width: "Width in pixels (range: 1-10000)",
    height: "Height in pixels (range: 1-10000)",
    label: "Optional { text, x, y } for centered text inside the shape",
  },

  textFields: {
    text: "The text content (max 2000 chars)",
    fontSize: "Font size in pixels (default: 16, range: 8-100)",
    fontFamily: "1 = hand-drawn, 2 = normal, 3 = monospace (default: 1)",
    textAlign: "'left' | 'center' | 'right' (default: 'left')",
  },

  arrowFields: {
    points: "Array of [x, y] tuples relative to element position. First point is [0, 0]",
    startArrowhead: "'arrow' | 'triangle' | 'diamond' | 'bar' | 'dot' | null (default: null)",
    endArrowhead: "'arrow' | 'triangle' | 'diamond' | 'bar' | 'dot' | null (default: 'arrow')",
    startBinding: "{ elementId: string, focus: 0, gap: 5 } to connect to another element",
    endBinding: "{ elementId: string, focus: 0, gap: 5 } to connect to another element",
    label: "Optional { text, x, y } for label at midpoint",
  },

  limits: {
    maxElements: 500,
    maxTextLength: 2000,
    coordRange: [-50000, 50000],
    dimensionRange: [1, 10000],
    fontSizeRange: [8, 100],
    strokeWidthRange: [0.5, 10],
  },
} as const;

export function getSpecForPrompt(diagramType: DiagramType): string {
  const styles = DIAGRAM_STYLES[diagramType];
  const styleEntries = Object.entries(styles)
    .map(([name, style]) => {
      const props = Object.entries(style)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(", ");
      return `  - ${name}: { ${props} }`;
    })
    .join("\n");

  return `## Excalidraw Element Specification

### Element Types
Use these types: ${EXCALIDRAW_SPEC.elementTypes.join(", ")}

### Common Fields (all elements)
${Object.entries(EXCALIDRAW_SPEC.commonFields)
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join("\n")}

### Shape Fields (rectangle, diamond, ellipse)
${Object.entries(EXCALIDRAW_SPEC.shapeFields)
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join("\n")}

### Text Fields
${Object.entries(EXCALIDRAW_SPEC.textFields)
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join("\n")}

### Arrow/Line Fields
${Object.entries(EXCALIDRAW_SPEC.arrowFields)
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join("\n")}

### Recommended Styles for ${diagramType}
${styleEntries}

### Limits
- Max ${EXCALIDRAW_SPEC.limits.maxElements} elements per diagram
- Coordinates: ${EXCALIDRAW_SPEC.limits.coordRange[0]} to ${EXCALIDRAW_SPEC.limits.coordRange[1]}
- Dimensions: ${EXCALIDRAW_SPEC.limits.dimensionRange[0]} to ${EXCALIDRAW_SPEC.limits.dimensionRange[1]}
- Text: max ${EXCALIDRAW_SPEC.limits.maxTextLength} characters

### Example: Rectangle with label
\`\`\`json
{
  "type": "rectangle",
  "id": "box-users",
  "x": 100, "y": 100,
  "width": 200, "height": 80,
  "backgroundColor": "#a5d8ff",
  "strokeColor": "#1e1e1e",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roughness": 1,
  "opacity": 100,
  "roundness": { "type": 3 }
}
\`\`\`

### Example: Arrow connecting two elements
\`\`\`json
{
  "type": "arrow",
  "id": "arrow-users-orders",
  "x": 300, "y": 140,
  "width": 100, "height": 0,
  "points": [[0, 0], [100, 0]],
  "endArrowhead": "arrow",
  "startBinding": { "elementId": "box-users", "focus": 0, "gap": 5 },
  "endBinding": { "elementId": "box-orders", "focus": 0, "gap": 5 }
}
\`\`\`

### Tips
- Use descriptive IDs (e.g., "table-users", "arrow-fk-orders")
- Set roughness: 0 for technical diagrams, 1 for hand-drawn style
- Use fontFamily: 3 (monospace) for code/SQL content
- Use the recommended styles above for consistent colors
- Arrow points are RELATIVE to the arrow's x,y position
- First point in arrow is always [0, 0]`;
}
