import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerDbSchemaPrompt(server: McpServer) {
  server.prompt(
    "db_schema_diagram",
    "Generate a database schema diagram from table definitions. Provide table names or paste SQL schema.",
    { tables: z.string().describe("Comma-separated table names, or paste your schema/migration SQL") },
    ({ tables }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Generate an Excalidraw diagram representing the database schema for: ${tables}

Instructions for generating elements:
- Create a rectangle element for each table (width: 200, height varies by column count ~40px per row + 50px header)
- Add a text element inside each rectangle with the table name (bold) and column names below
- Use arrow elements to represent foreign key relationships
- Space tables in a grid layout (x increments of 300, y increments of 300)
- Each element needs: id (unique string), type, x, y, width, height

Element defaults:
- Rectangles: strokeColor "#1e1e1e", backgroundColor "#a5d8ff", fillStyle "solid", roughness 1, roundness { type: 3 }
- Text: fontSize 16, fontFamily 1, textAlign "left"
- Arrows: startBinding and endBinding to connect to rectangle elements

After generating the elements array, use the create_diagram tool to save the diagram with a descriptive title.`,
          },
        },
      ],
    }),
  );
}
