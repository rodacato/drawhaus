import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSpecForPrompt } from "@drawhaus/helpers";

export function registerArchitecturePrompt(server: McpServer) {
  server.prompt(
    "architecture_diagram",
    "Generate an architecture diagram showing system components and their connections. Describe your system or paste code.",
    { system: z.string().describe("Description of the system architecture, or paste relevant code/config") },
    ({ system }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Generate an Excalidraw architecture diagram for: ${system}

Instructions:
- Create large rectangles for major services/components (width: 180–240, height: 80–120)
- Group related components visually (frontend at top, backend in middle, data layer at bottom)
- Use arrows to show communication between components (API calls, events, data flow)
- Add text labels inside rectangles for component names
- Use the recommended color scheme for different layers (see styles below)
- Space components with 80px gaps between them
- Use descriptive IDs like "svc-api-gateway", "db-postgres", "queue-redis"
- Use validate_elements to check your output before creating the diagram
- After validation passes, use create_diagram to save with a descriptive title

${getSpecForPrompt("architecture")}`,
          },
        },
      ],
    }),
  );
}
