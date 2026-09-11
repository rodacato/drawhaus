import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { FolderRepository } from "../../../domain/ports/folder-repository";
import { requirePlacement } from "../../helpers/require-placement";

export class CreateDiagramUseCase {
  constructor(
    private readonly diagrams: DiagramRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly folders: FolderRepository,
  ) {}

  async execute(input: {
    ownerId: string;
    title?: string;
    workspaceId?: string | null;
    folderId?: string | null;
    elements?: unknown[];
    appState?: Record<string, unknown>;
    createdVia?: string;
  }) {
    await requirePlacement(
      { workspaces: this.workspaces, folders: this.folders },
      { userId: input.ownerId, workspaceId: input.workspaceId ?? null },
      input.folderId,
    );
    return this.diagrams.create({
      ownerId: input.ownerId,
      title: input.title ?? "Untitled",
      workspaceId: input.workspaceId,
      folderId: input.folderId,
      elements: input.elements,
      appState: input.appState,
      createdVia: input.createdVia,
    });
  }
}
