import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

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

Instructions for generating elements:
- Create large rectangles for major services/components (width: 180–240, height: 80–120)
- Group related components visually (e.g., frontend layer at top, backend in middle, data layer at bottom)
- Use arrow elements to show communication between components (API calls, events, data flow)
- Add text labels inside rectangles for component names and brief descriptions
- Use different background colors for different layers:
  - Frontend/client: backgroundColor "#d3f9d8" (green)
  - Backend/API: backgroundColor "#a5d8ff" (blue)
  - Database/storage: backgroundColor "#ffec99" (yellow)
  - External services: backgroundColor "#ffd8a8" (orange)
  - Message queues/cache: backgroundColor "#eebefa" (purple)
- Space components with 80px gaps between them

Element defaults:
- Rectangles: strokeColor "#1e1e1e", fillStyle "solid", roughness 1, roundness { type: 3 }
- Text: fontSize 16 for component names, fontSize 12 for descriptions, fontFamily 1
- Arrows: strokeColor "#495057", roughness 1

After generating the elements, use the create_diagram tool to save with a descriptive title.`,
          },
        },
      ],
    }),
  );
}
