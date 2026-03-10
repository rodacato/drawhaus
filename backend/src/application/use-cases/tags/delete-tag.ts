import type { TagRepository } from "../../../domain/ports/tag-repository";

export class DeleteTagUseCase {
  constructor(private tags: TagRepository) {}

  async execute(tagId: string, userId: string) {
    await this.tags.delete(tagId, userId);
  }
}
