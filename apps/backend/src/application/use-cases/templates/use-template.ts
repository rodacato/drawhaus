import type { TemplateRepository } from "../../../domain/ports/template-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { FolderRepository } from "../../../domain/ports/folder-repository";
import { findReadableTemplate } from "../../helpers/find-readable-template";
import { requirePlacement } from "../../helpers/require-placement";

export class UseTemplateUseCase {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly diagrams: DiagramRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly folders: FolderRepository,
  ) {}

  async execute(input: {
    templateId: string;
    userId: string;
    title?: string;
    workspaceId?: string | null;
    folderId?: string | null;
  }) {
    const template = await findReadableTemplate(
      { templates: this.templates, workspaces: this.workspaces },
      input.templateId,
      input.userId,
    );
    await requirePlacement(
      { workspaces: this.workspaces, folders: this.folders },
      { userId: input.userId, workspaceId: input.workspaceId ?? null },
      input.folderId,
    );

    const diagram = await this.diagrams.create({
      ownerId: input.userId,
      title: input.title ?? template.title,
      workspaceId: input.workspaceId,
      folderId: input.folderId,
      elements: template.elements,
      appState: template.appState,
    });

    // Fire and forget — don't block diagram creation
    this.templates.incrementUsageCount(input.templateId).catch(() => {});

    return diagram;
  }
}
