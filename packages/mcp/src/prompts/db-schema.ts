import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSpecForPrompt } from "@drawhaus/helpers";

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

Instructions:
- Create a rectangle for each table (width: 200, height: ~40px per column + 50px header)
- Add text elements inside each rectangle: table name (fontSize 16, fontFamily 1) and columns below (fontSize 14, fontFamily 3)
- Use arrows for foreign key relationships with endArrowhead "arrow"
- Use descriptive IDs like "table-users", "arrow-fk-orders-users"
- Use validate_elements to check your output before creating the diagram
- After validation passes, use create_diagram to save with a descriptive title

${getSpecForPrompt("dbSchema")}`,
          },
        },
      ],
    }),
  );
}
