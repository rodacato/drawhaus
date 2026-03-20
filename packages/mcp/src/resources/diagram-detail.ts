import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DrawhausClient } from "../client.js";

export function registerDiagramDetailResource(server: McpServer, client: DrawhausClient) {
  server.resource(
    "diagram-detail",
    new ResourceTemplate("drawhaus://diagrams/{id}", { list: undefined }),
    { description: "Full diagram content including Excalidraw elements and app state" },
    async (uri, variables) => {
      const id = variables.id as string;
      const diagram = await client.getDiagram(id);
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(diagram, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    },
  );
}
