import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSequenceDiagramPrompt(server: McpServer) {
  server.prompt(
    "sequence_diagram",
    "Generate a sequence diagram showing interactions between components. Describe the flow or paste code.",
    { flow: z.string().describe("Description of the interaction flow, or paste relevant code") },
    ({ flow }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Generate an Excalidraw sequence diagram for: ${flow}

Instructions for generating elements:
- Create a rectangle at the top for each participant/actor (width: 120, height: 40)
- Draw a vertical dashed line below each participant (use a line element with strokeStyle "dashed")
- Use horizontal arrow elements for messages between participants (left-to-right for calls, right-to-left for responses)
- Add text labels on each arrow describing the message/method call
- Use small rectangles on lifelines for activation bars (width: 16, filled)
- Space participants horizontally (x increments of 200)
- Space messages vertically (y increments of 60)

Element defaults:
- Participant rectangles: strokeColor "#1e1e1e", backgroundColor "#d0bfff", fillStyle "solid", roughness 1
- Lifelines: strokeColor "#868e96", strokeStyle "dashed"
- Arrows: strokeColor "#1e1e1e" for calls, "#868e96" for responses (dashed)
- Text: fontSize 14, fontFamily 1

After generating the elements, use the create_diagram tool to save with a descriptive title.`,
          },
        },
      ],
    }),
  );
}
