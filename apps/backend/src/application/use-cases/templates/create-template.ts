import type { TemplateRepository } from "../../../domain/ports/template-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { WebhookDispatcher } from "../../../domain/ports/webhook-dispatcher";
import { requireWorkspaceAccess } from "../../helpers/require-placement";
import { templateEventData } from "../../helpers/webhook-payloads";

export class CreateTemplateUseCase {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly webhooks?: WebhookDispatcher,
  ) {}

  async execute(input: {
    creatorId: string;
    workspaceId?: string | null;
    title: string;
    description?: string;
    category?: string;
    elements: unknown[];
    appState: Record<string, unknown>;
    thumbnail?: string | null;
  }) {
    await requireWorkspaceAccess(this.workspaces, {
      userId: input.creatorId,
      workspaceId: input.workspaceId ?? null,
    });
    const template = await this.templates.create({
      creatorId: input.creatorId,
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description ?? "",
      category: input.category ?? "general",
      elements: input.elements,
      appState: input.appState,
      thumbnail: input.thumbnail,
    });

    this.webhooks?.dispatch({
      event: "template.created",
      actorId: input.creatorId,
      data: templateEventData(template),
    });

    return template;
  }
}
