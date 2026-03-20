import type { UserRepository } from "../../../domain/ports/user-repository";
import { ConflictError, NotFoundError } from "../../../domain/errors";

export class UpdateProfileUseCase {
  constructor(private users: UserRepository) {}

  async execute(userId: string, input: { name?: string; email?: string }) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("User");

    if (input.email && input.email !== user.email) {
      const existing = await this.users.findByEmail(input.email);
      if (existing) throw new ConflictError("Email already in use");
    }

    const updated = await this.users.update(userId, {
      name: input.name,
      email: input.email,
    });
    if (!updated) throw new NotFoundError("User");

    return { id: updated.id, email: updated.email, name: updated.name };
  }
}
