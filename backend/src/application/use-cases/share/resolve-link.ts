import type { ShareRepository } from "../../../domain/ports/share-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError, ExpiredError } from "../../../domain/errors";
import { isShareLinkExpired } from "../../../domain/entities/share-link";

export class ResolveLinkUseCase {
  constructor(
    private shares: ShareRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(token: string) {
    const link = await this.shares.findByToken(token);
    if (!link) throw new NotFoundError("Share link");
    if (isShareLinkExpired(link)) throw new ExpiredError("Share link");

    const diagram = await this.diagrams.findById(link.diagramId);
    if (!diagram) throw new NotFoundError("Diagram");

    return { link, diagram };
  }
}
