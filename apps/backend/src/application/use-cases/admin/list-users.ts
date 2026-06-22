import type { UserRepository } from "../../../domain/ports/user-repository";

export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute() {
    return this.users.listAll();
  }
}
