import type { User, UserRole } from "../entities/user";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: { email: string; name: string; passwordHash: string }): Promise<User>;
  update(id: string, data: Partial<Pick<User, "email" | "name" | "passwordHash">>): Promise<User | null>;
  count(): Promise<number>;
  listAll(): Promise<Omit<User, "passwordHash">[]>;
  adminUpdate(id: string, data: { role?: UserRole; disabled?: boolean }): Promise<User | null>;
  delete(id: string): Promise<void>;
}
