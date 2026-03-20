import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSpecForPrompt } from "@drawhaus/helpers";

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

Instructions:
- Create a rectangle for each class (width: 220, height: ~40px header + 25px per member + 20px padding)
- Divide visually with line elements into 3 sections: name, attributes, methods
- Use text elements for class name (fontSize 16), attributes and methods (fontSize 14, fontFamily 3)
- Use arrows for relationships:
  - Inheritance: endArrowhead "triangle", strokeStyle "solid"
  - Composition: endArrowhead "diamond", strokeStyle "solid"
  - Implementation: endArrowhead "triangle", strokeStyle "dashed"
  - Association: endArrowhead "arrow", strokeStyle "solid"
- Use strokeStyle "dashed" on interface rectangles
- Use descriptive IDs like "class-User", "arrow-inheritance-admin-user"
- Use validate_elements to check your output before creating the diagram
- After validation passes, use create_diagram to save with a descriptive title

${getSpecForPrompt("classDiagram")}`,
          },
        },
      ],
    }),
  );
}
