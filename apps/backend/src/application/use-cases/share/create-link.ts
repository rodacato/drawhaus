import type { ShareRepository } from "../../../domain/ports/share-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { ConflictError } from "../../../domain/errors";
import { requireEditAccess } from "../../helpers/require-access";

const MAX_LINKS_PER_DIAGRAM = 20;

export class CreateShareLinkUseCase {
  constructor(
    private shares: ShareRepository,
    private diagrams: DiagramRepository,
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
      throw new ConflictError(`Maximum of ${MAX_LINKS_PER_DIAGRAM} share links per diagram reached. Delete unused links first.`);
    }

    const expiresAt = input.expiresInHours
      ? new Date(Date.now() + input.expiresInHours * 3600_000)
      : null;

    return this.shares.create({
      diagramId: input.diagramId,
      createdBy: input.userId,
      role: input.role ?? "viewer",
      expiresAt,
    });
  }
}
