import type { TagRepository } from "../../../domain/ports/tag-repository";

export class ListTagsUseCase {
  constructor(private tags: TagRepository) {}

  async execute(userId: string) {
    return this.tags.list(userId);
  }
}
