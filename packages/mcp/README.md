# @drawhaus/mcp

MCP (Model Context Protocol) server for [Drawhaus](https://github.com/drawhaus/drawhaus) — create and manage diagrams from AI tools like Claude Code, Cursor, and VS Code.

## Prerequisites

- A running Drawhaus instance
- An API key (create one in Drawhaus → Settings → API Keys)
- Node.js >= 18

## Setup

### Claude Code

Add to `~/.claude/mcp.json`:

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

Add to Cursor Settings → MCP Servers:

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

Add to `.vscode/mcp.json`:

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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DRAWHAUS_URL` | Yes | URL of your Drawhaus instance |
| `DRAWHAUS_API_KEY` | Yes | API key (starts with `dhk_`) |

## Tools

| Tool | Description |
|------|-------------|
| `create_diagram` | Create a new diagram with optional Excalidraw elements |
| `list_diagrams` | List diagrams in the workspace (with pagination) |
| `get_diagram` | Get full diagram content including elements |
| `update_diagram` | Update title, elements, or app state |
| `delete_diagram` | Permanently delete a diagram |

## Resources

| URI | Description |
|-----|-------------|
| `drawhaus://diagrams` | List of all diagrams in the workspace |
| `drawhaus://diagrams/{id}` | Full diagram content by ID |

## Prompts

| Prompt | Description |
|--------|-------------|
| `db_schema_diagram` | Generate a database schema diagram |
| `class_diagram` | Generate a class diagram |
| `sequence_diagram` | Generate a sequence diagram |
| `architecture_diagram` | Generate an architecture diagram |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build --workspace=packages/mcp

# Run tests
npm test --workspace=packages/mcp

# Dev mode (requires DRAWHAUS_URL and DRAWHAUS_API_KEY)
npm run dev --workspace=packages/mcp
```
