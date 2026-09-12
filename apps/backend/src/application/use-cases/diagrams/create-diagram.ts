import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { FolderRepository } from "../../../domain/ports/folder-repository";
import type { WebhookDispatcher } from "../../../domain/ports/webhook-dispatcher";
import { requirePlacement } from "../../helpers/require-placement";
import { diagramEventData } from "../../helpers/webhook-payloads";

export class CreateDiagramUseCase {
  constructor(
    private readonly diagrams: DiagramRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly folders: FolderRepository,
    private readonly webhooks?: WebhookDispatcher,
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
    const diagram = await this.diagrams.create({
      ownerId: input.ownerId,
      title: input.title ?? "Untitled",
      workspaceId: input.workspaceId,
      folderId: input.folderId,
      elements: input.elements,
      appState: input.appState,
      createdVia: input.createdVia,
    });

    this.webhooks?.dispatch({
      event: "diagram.created",
      actorId: input.ownerId,
      data: diagramEventData(diagram),
    });

    return diagram;
  }
}
