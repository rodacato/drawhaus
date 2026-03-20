import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DrawhausClient } from "../client.js";
import { DeleteDiagramInput } from "../schemas.js";
import { formatErrorForMcp } from "../errors.js";

export function registerDeleteDiagram(server: McpServer, client: DrawhausClient) {
  server.tool(
    "delete_diagram",
    "Permanently delete a diagram. This action cannot be undone.",
    DeleteDiagramInput.shape,
    async (args) => {
      try {
        const { id } = DeleteDiagramInput.parse(args);
        await client.deleteDiagram(id);

        return {
          content: [
            {
              type: "text" as const,
              text: `Diagram ${id} deleted successfully.`,
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
