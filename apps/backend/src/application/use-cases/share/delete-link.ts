import type { ShareRepository } from "../../../domain/ports/share-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { RealtimeNotifier } from "../../../domain/ports/realtime-notifier";
import { NotFoundError } from "../../../domain/errors";

export class DeleteLinkUseCase {
  constructor(
    private readonly shares: ShareRepository,
    private readonly diagrams: DiagramRepository,
    private readonly notifier: RealtimeNotifier,
  ) {}

  async execute(token: string, userId: string) {
    const link = await this.shares.findByToken(token);
    if (!link) throw new NotFoundError("Share link");

    const role = await this.diagrams.findAccessRole(link.diagramId, userId);
    if (link.createdBy !== userId && role !== "owner") throw new NotFoundError("Share link");

    await this.shares.delete(token);
    this.notifier.accessRevoked({ kind: "share-link", shareToken: token });
  }
}
