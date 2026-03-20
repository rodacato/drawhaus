import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerClassDiagramPrompt(server: McpServer) {
  server.prompt(
    "class_diagram",
    "Generate a class diagram from class definitions. Provide class names or paste source code.",
    { classes: z.string().describe("Comma-separated class names, or paste source code with class definitions") },
    ({ classes }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Generate an Excalidraw class diagram for: ${classes}

Instructions for generating elements:
- Create a rectangle for each class (width: 220, height varies: ~40px header + 25px per attribute + 25px per method + 20px padding)
- Divide each class rectangle visually into 3 sections: name (bold, centered), attributes, methods
- Use text elements for class name, attributes (with types), and methods (with return types)
- Use arrow elements for relationships:
  - Solid arrow (inheritance/extends)
  - Diamond-ended arrow (composition)
  - Dashed arrow (implements/interface)
- Space classes in a grid layout (x increments of 320, y increments of 350)

Element defaults:
- Rectangles: strokeColor "#1e1e1e", backgroundColor "#e7f5ff", fillStyle "solid", roughness 1
- Text: fontSize 14, fontFamily 3 (monospace for attributes/methods), fontFamily 1 for class names
- Use strokeStyle "dashed" for interface rectangles

After generating the elements, use the create_diagram tool to save with a descriptive title.`,
          },
        },
      ],
    }),
  );
}
