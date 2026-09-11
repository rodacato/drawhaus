import type { ShareRepository } from "../../../domain/ports/share-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import { NotFoundError, ExpiredError } from "../../../domain/errors";
import { isShareLinkExpired } from "../../../domain/entities/share-link";
import { withSceneContent } from "../../helpers/scene-content";

export class ResolveLinkUseCase {
  constructor(
    private readonly shares: ShareRepository,
    private readonly diagrams: DiagramRepository,
    private readonly scenes: SceneRepository,
  ) {}

  async execute(token: string) {
    const link = await this.shares.findByToken(token);
    if (!link) throw new NotFoundError("Share link");
    if (isShareLinkExpired(link)) throw new ExpiredError("Share link");

    const diagram = await this.diagrams.findById(link.diagramId);
    if (!diagram) throw new NotFoundError("Diagram");

    return { link, diagram: await withSceneContent(diagram, this.scenes) };
  }
}
