import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DrawhausClient } from "../client.js";
import { UpdateDiagramInput } from "../schemas.js";
import { formatErrorForMcp } from "../errors.js";
import { validateElements } from "@drawhaus/helpers";

export function registerUpdateDiagram(server: McpServer, client: DrawhausClient) {
  server.tool(
    "update_diagram",
    "Update a diagram's title, elements, or app state. At least one field must be provided. " +
      "Elements and appState replace the existing values entirely.",
    {
      id: UpdateDiagramInput._def.schema.shape.id,
      title: UpdateDiagramInput._def.schema.shape.title,
      elements: UpdateDiagramInput._def.schema.shape.elements,
      appState: UpdateDiagramInput._def.schema.shape.appState,
    },
    async (args) => {
      try {
        const input = UpdateDiagramInput.parse(args);

        if (input.elements && Array.isArray(input.elements)) {
          const validation = validateElements(input.elements);
          if (!validation.valid) {
            const errorList = validation.errors
              .map(
                (e) =>
                  `Element ${e.elementIndex}${e.elementId ? ` (${e.elementId})` : ""}: ${e.field} — ${e.message}`,
              )
              .join("\n");
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Element validation failed. Fix these errors and try again:\n\n${errorList}`,
                },
              ],
              isError: true,
            };
          }
        }

        const { id, ...updateData } = input;
        const diagram = await client.updateDiagram(id, updateData);

        const changes: string[] = [];
        if (input.title !== undefined) changes.push(`title → "${diagram.title}"`);
        if (input.elements !== undefined)
          changes.push(`elements (${Array.isArray(diagram.elements) ? diagram.elements.length : 0} items)`);
        if (input.appState !== undefined) changes.push("appState");

        const text = [
          `Diagram updated successfully!`,
          ``,
          `URL: ${diagram.url}`,
          `ID: ${diagram.id}`,
          `Changes: ${changes.join(", ")}`,
          `Updated: ${diagram.updatedAt}`,
        ].join("\n");

        return { content: [{ type: "text" as const, text }] };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error) }],
          isError: true,
        };
      }
    },
  );
}
