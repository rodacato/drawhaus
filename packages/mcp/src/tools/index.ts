import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DrawhausClient } from "../client.js";
import { registerCreateDiagram } from "./create-diagram.js";
import { registerListDiagrams } from "./list-diagrams.js";
import { registerGetDiagram } from "./get-diagram.js";
import { registerUpdateDiagram } from "./update-diagram.js";
import { registerDeleteDiagram } from "./delete-diagram.js";
import { registerValidateElements } from "./validate-elements.js";

export function registerAllTools(server: McpServer, client: DrawhausClient) {
  registerCreateDiagram(server, client);
  registerListDiagrams(server, client);
  registerGetDiagram(server, client);
  registerUpdateDiagram(server, client);
  registerDeleteDiagram(server, client);
  registerValidateElements(server);
}
