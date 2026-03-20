import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DrawhausClient } from "./client.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";

const VERSION = "0.1.0";

function log(message: string) {
  process.stderr.write(`[drawhaus-mcp] ${message}\n`);
}

function fatal(message: string): never {
  log(`ERROR: ${message}`);
  process.exit(1);
}

async function main() {
  const url = process.env.DRAWHAUS_URL;
  const apiKey = process.env.DRAWHAUS_API_KEY;

  if (!url) {
    fatal("DRAWHAUS_URL environment variable is required.\nExample: DRAWHAUS_URL=http://localhost:4000");
  }

  if (!apiKey) {
    fatal(
      "DRAWHAUS_API_KEY environment variable is required.\n" +
        "Create an API key in Drawhaus → Settings → API Keys.",
    );
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    fatal(`Invalid DRAWHAUS_URL: "${url}". Must be a valid URL (e.g., http://localhost:4000).`);
  }

  // Warn if not HTTPS (except localhost)
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    log(`WARNING: DRAWHAUS_URL uses HTTP, not HTTPS. Consider using HTTPS in production.`);
  }

  const client = new DrawhausClient(url, apiKey);

  // Health check
  try {
    const health = await client.health();
    if (health.status !== "ok") {
      log(`WARNING: Drawhaus health check returned status "${health.status}".`);
    }
    log(`Connected to Drawhaus v${health.version} (database: ${health.database})`);
  } catch (error) {
    const msg =
      error instanceof TypeError
        ? `Could not connect to Drawhaus at ${url}. Is the server running?`
        : `Health check failed: ${error}`;
    fatal(msg);
  }

  // Create MCP server
  const server = new McpServer({
    name: "drawhaus",
    version: VERSION,
  });

  registerAllTools(server, client);
  registerAllResources(server, client);
  registerAllPrompts(server);

  // Connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  log("MCP server running on stdio");

  // Graceful shutdown
  const shutdown = async () => {
    log("Shutting down...");
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  log(`Fatal error: ${error}`);
  process.exit(1);
});
