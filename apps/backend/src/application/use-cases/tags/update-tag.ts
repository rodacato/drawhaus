import type { TagRepository } from "../../../domain/ports/tag-repository";

export class UpdateTagUseCase {
  constructor(private readonly tags: TagRepository) {}

  async execute(tagId: string, userId: string, data: { name?: string; color?: string }) {
    return this.tags.update(tagId, userId, data);
  }
}
