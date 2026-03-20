import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateElements } from "@drawhaus/helpers";

export function registerValidateElements(server: McpServer) {
  server.tool(
    "validate_elements",
    "Validate Excalidraw elements before creating a diagram. " +
      "Returns validation errors with actionable hints. Use this to check your elements are valid before calling create_diagram.",
    {
      elements: z
        .array(z.record(z.string(), z.unknown()))
        .describe("Array of Excalidraw element objects to validate"),
    },
    async (args) => {
      const result = validateElements(args.elements);

      if (result.valid && result.warnings.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Valid! ${args.elements.length} elements passed validation.`,
            },
          ],
        };
      }

      const parts: string[] = [];

      if (result.errors.length > 0) {
        const errorList = result.errors
          .map(
            (e) =>
              `  Element ${e.elementIndex}${e.elementId ? ` (${e.elementId})` : ""}: ${e.field} — ${e.message}`,
          )
          .join("\n");
        parts.push(`Errors:\n${errorList}`);
      }

      if (result.warnings.length > 0) {
        const warnList = result.warnings
          .map(
            (w) =>
              `  Element ${w.elementIndex}${w.elementId ? ` (${w.elementId})` : ""}: ${w.field} — ${w.message}`,
          )
          .join("\n");
        parts.push(`Warnings:\n${warnList}`);
      }

      if (!result.valid) {
        parts.push(
          "\nFix the errors above and try again. Warnings are non-blocking but indicate potential issues.",
        );
      }

      return {
        content: [{ type: "text" as const, text: parts.join("\n\n") }],
        isError: !result.valid,
      };
    },
  );
}
