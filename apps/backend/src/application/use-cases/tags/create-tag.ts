import type { TagRepository } from "../../../domain/ports/tag-repository";

export class CreateTagUseCase {
  constructor(private tags: TagRepository) {}

  async execute(userId: string, name: string, color: string = "#6B7280") {
    return this.tags.create(userId, name, color);
  }
}
