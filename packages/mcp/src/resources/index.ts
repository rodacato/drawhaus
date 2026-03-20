import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DrawhausClient } from "../client.js";
import { registerDiagramListResource } from "./diagram-list.js";
import { registerDiagramDetailResource } from "./diagram-detail.js";

export function registerAllResources(server: McpServer, client: DrawhausClient) {
  registerDiagramListResource(server, client);
  registerDiagramDetailResource(server, client);
}
