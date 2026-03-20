import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DrawhausClient } from "../client.js";
import { ListDiagramsInput } from "../schemas.js";
import { formatErrorForMcp } from "../errors.js";

export function registerListDiagrams(server: McpServer, client: DrawhausClient) {
  server.tool(
    "list_diagrams",
    "List diagrams in the Drawhaus workspace. Returns titles, IDs, and URLs. " +
      "Supports pagination with limit/offset and optional folder filtering.",
    ListDiagramsInput.shape,
    async (args) => {
      try {
        const input = ListDiagramsInput.parse(args);
        const result = await client.listDiagrams(input);

        if (result.data.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No diagrams found in this workspace.",
              },
            ],
          };
        }

        const header = `| Title | ID | URL | Updated |`;
        const separator = `|-------|-----|-----|---------|`;
        const rows = result.data.map(
          (d) => `| ${d.title} | ${d.id} | ${d.url} | ${d.updatedAt} |`,
        );

        const text = [
          `Found ${result.total} diagram(s) (showing ${result.data.length}):`,
          "",
          header,
          separator,
          ...rows,
          "",
          `Page: offset=${result.offset}, limit=${result.limit}, total=${result.total}`,
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
