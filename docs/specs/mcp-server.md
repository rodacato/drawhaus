# MCP Server

> Expose Drawhaus as an MCP tool server so AI agents can create and manipulate diagrams programmatically.

## Why

Strongest differentiator — no other self-hosted whiteboard has this. Any AI agent (Claude Code, Cursor, Copilot, Windsurf) can interact with Drawhaus through the universal MCP protocol. One implementation covers all AI clients.

## Tools

| Tool | Description |
|------|-------------|
| `create_diagram` | Create a new diagram with optional Excalidraw elements |
| `list_diagrams` | List diagrams in a workspace, optionally filtered by folder |
| `update_diagram` | Update diagram title, elements, or metadata |
| `get_diagram` | Get diagram content including Excalidraw elements |

## Open Questions

- Separate process or embedded in the backend?
- Auth: API keys (requires Public API infra) or session-based?
- Should it expose template and workspace operations too?

## Panel Notes

- Rafa: clean fit — use cases already exist, MCP server is a transport layer
- Maya: strongest differentiator for developer audience
- Ethan: distribution angle — devs discover Drawhaus through their AI tools
