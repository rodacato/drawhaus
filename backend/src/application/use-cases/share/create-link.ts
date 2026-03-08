import type { ShareRepository } from "../../../domain/ports/share-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

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
    if (!accessRole) throw new NotFoundError("Diagram");
    if (accessRole !== "owner" && accessRole !== "editor") throw new ForbiddenError();

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
