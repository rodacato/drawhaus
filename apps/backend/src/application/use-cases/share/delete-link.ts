import type { ShareRepository } from "../../../domain/ports/share-repository";
import type { RealtimeNotifier } from "../../../domain/ports/realtime-notifier";
import { NotFoundError } from "../../../domain/errors";

export class DeleteLinkUseCase {
  constructor(
    private readonly shares: ShareRepository,
    private readonly notifier: RealtimeNotifier,
  ) {}

  async execute(token: string, userId: string) {
    const createdBy = await this.shares.findCreatedBy(token);
    if (!createdBy || createdBy !== userId) throw new NotFoundError("Share link");
    await this.shares.delete(token);
    this.notifier.accessRevoked({ kind: "share-link", shareToken: token });
  }
}
