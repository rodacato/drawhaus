import { z } from "zod";

export const CreateDiagramInput = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe("Diagram title. Defaults to 'Untitled' if omitted."),
  elements: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe(
      "Excalidraw elements array. Each element should have at least: id, type, x, y, width, height.",
    ),
  appState: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Excalidraw app state. Common keys: viewBackgroundColor, gridSize."),
  folderId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe("UUID of the folder to place the diagram in. Null for root."),
});

export const ListDiagramsInput = z.object({
  folderId: z.string().uuid().optional().describe("Filter by folder UUID."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Max results (1–100, default 50)."),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Pagination offset."),
});

export const GetDiagramInput = z.object({
  id: z.string().uuid().describe("Diagram UUID."),
});

export const UpdateDiagramInput = z
  .object({
    id: z.string().uuid().describe("Diagram UUID to update."),
    title: z.string().min(1).max(200).optional().describe("New title."),
    elements: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe("New Excalidraw elements array (replaces existing)."),
    appState: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("New Excalidraw app state (replaces existing)."),
  })
  .refine(
    (v) => v.title !== undefined || v.elements !== undefined || v.appState !== undefined,
    { message: "At least one field (title, elements, appState) is required" },
  );

export const DeleteDiagramInput = z.object({
  id: z.string().uuid().describe("Diagram UUID to delete."),
});
