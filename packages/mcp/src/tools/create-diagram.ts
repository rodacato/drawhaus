import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DrawhausClient } from "../client.js";
import { CreateDiagramInput } from "../schemas.js";
import { formatErrorForMcp } from "../errors.js";

export function registerCreateDiagram(server: McpServer, client: DrawhausClient) {
  server.tool(
    "create_diagram",
    "Create a new diagram in Drawhaus. Returns the diagram URL and metadata. " +
      "Pass Excalidraw-format elements to populate the diagram, or omit for a blank canvas.",
    CreateDiagramInput.shape,
    async (args) => {
      try {
        const input = CreateDiagramInput.parse(args);
        const diagram = await client.createDiagram(input);
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Diagram created successfully!`,
                ``,
                `URL: ${diagram.url}`,
                `ID: ${diagram.id}`,
                `Title: ${diagram.title}`,
                `Created: ${diagram.createdAt}`,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error) }],
          isError: true,
        };
      }
    },
  );
}
