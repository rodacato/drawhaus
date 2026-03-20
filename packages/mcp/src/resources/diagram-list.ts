import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DrawhausClient } from "../client.js";

export function registerDiagramListResource(server: McpServer, client: DrawhausClient) {
  server.resource(
    "diagram-list",
    "drawhaus://diagrams",
    { description: "List of all diagrams in the workspace" },
    async (uri) => {
      const result = await client.listDiagrams({ limit: 100 });
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(result.data, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    },
  );
}
