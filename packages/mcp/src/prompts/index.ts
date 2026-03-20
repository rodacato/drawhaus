import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDbSchemaPrompt } from "./db-schema.js";
import { registerClassDiagramPrompt } from "./class-diagram.js";
import { registerSequenceDiagramPrompt } from "./sequence-diagram.js";
import { registerArchitecturePrompt } from "./architecture.js";

export function registerAllPrompts(server: McpServer) {
  registerDbSchemaPrompt(server);
  registerClassDiagramPrompt(server);
  registerSequenceDiagramPrompt(server);
  registerArchitecturePrompt(server);
}
