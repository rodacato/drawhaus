import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DrawhausClient } from "../client.js";
import { GetDiagramInput } from "../schemas.js";
import { formatErrorForMcp } from "../errors.js";

export function registerGetDiagram(server: McpServer, client: DrawhausClient) {
  server.tool(
    "get_diagram",
    "Get a diagram's full content including Excalidraw elements and app state. " +
      "Use this to inspect or read the current state of a diagram before updating it.",
    GetDiagramInput.shape,
    async (args) => {
      try {
        const { id } = GetDiagramInput.parse(args);
        const diagram = await client.getDiagram(id);

        const text = [
          `Title: ${diagram.title}`,
          `URL: ${diagram.url}`,
          `ID: ${diagram.id}`,
          `Created via: ${diagram.createdVia}`,
          `Updated: ${diagram.updatedAt}`,
          ``,
          `Elements (${Array.isArray(diagram.elements) ? diagram.elements.length : 0}):`,
          JSON.stringify(diagram.elements, null, 2),
          ``,
          `App State:`,
          JSON.stringify(diagram.appState, null, 2),
        ].join("\n");

        return { content: [{ type: "text" as const, text }] };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error) }],
          isError: true,
        };
      }
    },
  );
}
