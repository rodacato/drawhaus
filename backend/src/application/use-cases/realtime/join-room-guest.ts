import type { ShareRepository } from "../../../domain/ports/share-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import { isShareLinkExpired } from "../../../domain/entities/share-link";

export class JoinRoomGuestUseCase {
  constructor(
    private shares: ShareRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(shareToken: string): Promise<{
    diagramId: string;
    role: "editor" | "viewer";
    elements: unknown[];
    appState: Record<string, unknown>;
  }> {
    const link = await this.shares.findByToken(shareToken);
    if (!link || isShareLinkExpired(link)) {
      throw new NotFoundError("Share link");
    }

    const diagram = await this.diagrams.findById(link.diagramId);
    return {
      diagramId: link.diagramId,
      role: link.role,
      elements: diagram?.elements ?? [],
      appState: diagram?.appState ?? {},
    };
  }
}
