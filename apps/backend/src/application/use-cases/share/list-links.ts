import type { ShareRepository } from "../../../domain/ports/share-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { requireEditAccess } from "../../helpers/require-access";

export class ListLinksUseCase {
  constructor(
    private readonly shares: ShareRepository,
    private readonly diagrams: DiagramRepository,
  ) {}

  async execute(diagramId: string, userId: string) {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireEditAccess(role);

    const links = await this.shares.findByDiagram(diagramId);
    return role === "owner" ? links : links.filter((link) => link.createdBy === userId);
  }
}
