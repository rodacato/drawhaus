import type { ShareRepository } from "../../../domain/ports/share-repository";
import { NotFoundError } from "../../../domain/errors";

export class DeleteLinkUseCase {
  constructor(private shares: ShareRepository) {}

  async execute(token: string, userId: string) {
    const createdBy = await this.shares.findCreatedBy(token);
    if (!createdBy || createdBy !== userId) throw new NotFoundError("Share link");
    await this.shares.delete(token);
  }
}
