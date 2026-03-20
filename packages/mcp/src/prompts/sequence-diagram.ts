import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSpecForPrompt } from "@drawhaus/helpers";

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

Instructions:
- Create a rectangle at the top for each participant (width: 120, height: 40)
- Draw a vertical dashed line below each participant (line element with strokeStyle "dashed")
- Use horizontal arrows for messages: solid for calls, dashed for responses
- Add text labels on each arrow describing the message
- Use small rectangles on lifelines for activation bars (width: 16)
- Space participants horizontally (x increments of 200)
- Space messages vertically (y increments of 60)
- Use descriptive IDs like "participant-client", "msg-auth-request"
- Use validate_elements to check your output before creating the diagram
- After validation passes, use create_diagram to save with a descriptive title

${getSpecForPrompt("sequence")}`,
          },
        },
      ],
    }),
  );
}
