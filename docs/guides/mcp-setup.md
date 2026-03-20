# MCP Server Setup Guide

Use the Drawhaus MCP server to create and manage diagrams directly from AI coding assistants like Claude Code, Cursor, and VS Code Copilot.

## Prerequisites

1. A running Drawhaus instance (local or deployed)
2. An API key — create one in **Settings → API Keys**
3. Node.js >= 18 on the machine running the AI tool

## Step 1: Install the MCP Server

### Option A — From GitHub Packages (recommended)

The `@drawhaus/mcp` package is published to GitHub Packages on every release. Configure npm to use the GitHub registry for `@drawhaus` packages:

```bash
echo "@drawhaus:registry=https://npm.pkg.github.com" >> ~/.npmrc
```

Then you can use `npx @drawhaus/mcp` directly in the configs below.

### Option B — From source (local build)

If you prefer to build from the repository:

```bash
git clone https://github.com/rodacato/drawhaus.git
cd drawhaus
npm ci
npm run build --workspace=@drawhaus/helpers
npm run build --workspace=@drawhaus/mcp

# Get the absolute path for the configs below:
echo "$(pwd)/packages/mcp/dist/index.js"
```

## Step 2: Create an API Key

1. Open your Drawhaus instance in the browser
2. Go to **Settings → API Keys**
3. Click **Create API Key**
4. Give it a name (e.g., "Claude Code") and select the workspace
5. Copy the key — it starts with `dhk_` and is shown only once

## Step 3: Configure Your AI Tool

> The examples below use `npx @drawhaus/mcp` (GitHub Packages install). If you built from source, replace with `"command": "node", "args": ["/path/to/drawhaus/packages/mcp/dist/index.js"]`.

### Claude Code

**Via CLI (recommended):**

```bash
claude mcp add drawhaus \
  -e DRAWHAUS_URL=http://localhost:4000 \
  -e DRAWHAUS_API_KEY=dhk_your_api_key \
  -- npx @drawhaus/mcp
```

Use `--scope project` to share with your team (saves to `.mcp.json`) or `--scope user` for personal use (saves to `~/.claude.json`).

**Or manually** — add to `.mcp.json` in your project root (or `~/.claude.json` for user-wide):

```json
{
  "mcpServers": {
    "drawhaus": {
      "command": "npx",
      "args": ["@drawhaus/mcp"],
      "env": {
        "DRAWHAUS_URL": "http://localhost:4000",
        "DRAWHAUS_API_KEY": "dhk_your_api_key"
      }
    }
  }
}
```

### Cursor

Go to **Cursor Settings → MCP Servers** and add:

```json
{
  "drawhaus": {
    "command": "npx",
    "args": ["@drawhaus/mcp"],
    "env": {
      "DRAWHAUS_URL": "http://localhost:4000",
      "DRAWHAUS_API_KEY": "dhk_your_api_key"
    }
  }
}
```

### VS Code (Copilot)

Add to your project's `.vscode/mcp.json`:

```json
{
  "servers": {
    "drawhaus": {
      "command": "npx",
      "args": ["@drawhaus/mcp"],
      "env": {
        "DRAWHAUS_URL": "http://localhost:4000",
        "DRAWHAUS_API_KEY": "dhk_your_api_key"
      }
    }
  }
}
```

> Replace `http://localhost:4000` with your Drawhaus instance URL if deployed remotely.
>
> **npm publish alternative:** If you publish `@drawhaus/mcp` to an npm registry, you can use `"command": "npx", "args": ["@drawhaus/mcp"]` instead of the absolute path.

## Step 4: Verify the Connection

After configuring, the MCP server performs a health check on startup. If the connection fails, you'll see an error in the AI tool's MCP logs.

Common checks:

- Ensure Drawhaus is running and reachable from the machine
- Ensure the API key is valid and not expired/revoked
- Ensure `DRAWHAUS_URL` does not have a trailing slash

## Using the MCP Server

### Available Tools

| Tool                | Description                                   | Example Prompt                                      |
| ------------------- | --------------------------------------------- | --------------------------------------------------- |
| `create_diagram`    | Create a new diagram with Excalidraw elements | "Create a database schema diagram for this project" |
| `list_diagrams`     | List diagrams in the workspace                | "What diagrams do I have in Drawhaus?"              |
| `get_diagram`       | Get full diagram content                      | "Show me the contents of diagram X"                 |
| `update_diagram`    | Update title, elements, or app state          | "Add a new entity to diagram X"                     |
| `delete_diagram`    | Delete a diagram permanently                  | "Delete the test diagram"                           |
| `validate_elements` | Validate Excalidraw elements before creating  | "Check if these elements are valid"                 |

### Available Prompts

Prompts provide the AI with curated instructions and Excalidraw element specifications for specific diagram types:

| Prompt                 | Best For                                              |
| ---------------------- | ----------------------------------------------------- |
| `db_schema_diagram`    | Database tables, columns, relationships, foreign keys |
| `class_diagram`        | Classes, interfaces, inheritance, composition         |
| `sequence_diagram`     | Request flows, service interactions, message ordering |
| `architecture_diagram` | System components, services, infrastructure layout    |

### Available Resources

| URI                        | Description                                   |
| -------------------------- | --------------------------------------------- |
| `drawhaus://diagrams`      | Summary list of all diagrams in the workspace |
| `drawhaus://diagrams/{id}` | Full content of a specific diagram            |

## Example Workflows

### Generate a Database Schema Diagram

```
You: "Read the database migrations in this project and create a diagram
      in Drawhaus showing all tables and their relationships"
```

The AI will:

1. Read your migration files or schema definitions
2. Use the `db_schema_diagram` prompt to understand the Excalidraw format
3. Call `create_diagram` with properly positioned elements
4. Return a clickable link to the diagram in Drawhaus

### Update an Existing Diagram

```
You: "Add the new `audit_logs` table to the database diagram"
```

The AI will:

1. Call `list_diagrams` to find the existing diagram
2. Call `get_diagram` to read current elements
3. Generate new elements for the `audit_logs` table
4. Call `update_diagram` to add them to the canvas

### Generate Architecture from Code

```
You: "Create an architecture diagram showing the backend services,
      their dependencies, and how they communicate"
```

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"

The Drawhaus instance is not reachable. Check:

- Is Drawhaus running? (`npm run dev` or check your deployment)
- Is the URL correct? Try opening `DRAWHAUS_URL/v1/health` in a browser

### "401 Unauthorized"

The API key is invalid. Check:

- Does the key start with `dhk_`?
- Has the key been revoked? Check Settings → API Keys
- Has the key expired?

### "400 Bad Request — Missing X-Drawhaus-Client header"

This shouldn't happen with the official MCP server (it adds the header automatically). If you see this, you may be calling the `/v1/` API directly — add the header:

```
X-Drawhaus-Client: my-script
```

### Elements Not Rendering Correctly

Use `validate_elements` before creating a diagram to check for structural issues. Common problems:

- Missing `type` field on elements
- Coordinates outside valid range
- Text elements without `text` field

### Rate Limit Errors (429)

The API allows 60 requests per minute per API key. If you hit this limit, wait a moment and retry. For bulk operations, batch your changes into fewer `update_diagram` calls.
