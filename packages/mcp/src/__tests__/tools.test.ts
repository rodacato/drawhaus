import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { DrawhausClient } from "../client.js";
import { registerAllTools } from "../tools/index.js";

const EXPECTED_TOOLS = [
  "create_diagram",
  "list_diagrams",
  "get_diagram",
  "update_diagram",
  "delete_diagram",
  "validate_elements",
];

async function connectServer() {
  const server = new McpServer({ name: "drawhaus", version: "test" });
  registerAllTools(server, new DrawhausClient("http://127.0.0.1:1", "test-key"));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "test" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("tool registration", () => {
  let client: Client;
  let tools: Awaited<ReturnType<Client["listTools"]>>["tools"];

  before(async () => {
    client = await connectServer();
    tools = (await client.listTools()).tools;
  });

  it("registers every tool without throwing", () => {
    assert.deepEqual(tools.map((t) => t.name).sort(), [...EXPECTED_TOOLS].sort());
  });

  it("publishes a usable input schema for every tool", () => {
    for (const tool of tools) {
      assert.equal(tool.inputSchema.type, "object", `${tool.name} has no object input schema`);
    }
  });

  it("exposes every update_diagram field", () => {
    const updateDiagram = tools.find((t) => t.name === "update_diagram");
    assert.ok(updateDiagram);
    assert.deepEqual(Object.keys(updateDiagram.inputSchema.properties ?? {}).sort(), [
      "appState",
      "elements",
      "id",
      "title",
    ]);
    assert.deepEqual(updateDiagram.inputSchema.required, ["id"]);
  });

  it("rejects an update_diagram call that changes nothing", async () => {
    const result = await client.callTool({
      name: "update_diagram",
      arguments: { id: "550e8400-e29b-41d4-a716-446655440000" },
    });

    assert.equal(result.isError, true);
    const [content] = result.content as { type: string; text: string }[];
    assert.match(content.text, /At least one field/);
  });
});
