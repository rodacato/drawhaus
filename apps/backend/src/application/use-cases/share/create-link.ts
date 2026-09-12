import type { ShareRepository } from "../../../domain/ports/share-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { WebhookDispatcher } from "../../../domain/ports/webhook-dispatcher";
import { ConflictError } from "../../../domain/errors";
import { requireEditAccess } from "../../helpers/require-access";
import { shareLinkEventData } from "../../helpers/webhook-payloads";

const MAX_LINKS_PER_DIAGRAM = 20;

export class CreateShareLinkUseCase {
  constructor(
    private readonly shares: ShareRepository,
    private readonly diagrams: DiagramRepository,
    private readonly webhooks?: WebhookDispatcher,
  ) {}

  async execute(input: {
    diagramId: string;
    userId: string;
    role?: "editor" | "viewer";
    expiresInHours?: number;
  }) {
    const accessRole = await this.diagrams.findAccessRole(input.diagramId, input.userId);
    requireEditAccess(accessRole);

    const existing = await this.shares.findByDiagram(input.diagramId);
    if (existing.length >= MAX_LINKS_PER_DIAGRAM) {
      throw new ConflictError(
        `Maximum of ${MAX_LINKS_PER_DIAGRAM} share links per diagram reached. Delete unused links first.`,
      );
    }

    const expiresAt = input.expiresInHours
      ? new Date(Date.now() + input.expiresInHours * 3_600_000)
      : null;

    const link = await this.shares.create({
      diagramId: input.diagramId,
      createdBy: input.userId,
      role: input.role ?? "viewer",
      expiresAt,
    });

    this.webhooks?.dispatch({
      event: "diagram.shared",
      actorId: input.userId,
      data: shareLinkEventData(link),
    });

    return link;
  }
}
