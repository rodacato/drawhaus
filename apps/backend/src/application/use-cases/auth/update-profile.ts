import type { UserRepository } from "../../../domain/ports/user-repository";
import { ConflictError, NotFoundError } from "../../../domain/errors";

export class UpdateProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string, input: { name?: string; email?: string }) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("User");

    const email = input.email?.toLowerCase();
    if (email && email !== user.email) {
      const existing = await this.users.findByEmail(email);
      if (existing) throw new ConflictError("Email already in use");
    }

    const updated = await this.users.update(userId, {
      name: input.name,
      email,
    });
    if (!updated) throw new NotFoundError("User");

    return { id: updated.id, email: updated.email, name: updated.name };
  }
}
