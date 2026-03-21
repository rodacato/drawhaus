import type { User, UserRole } from "../entities/user";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findByGitHubId(githubId: string): Promise<User | null>;
  create(data: { email: string; name: string; passwordHash: string | null; googleId?: string; githubId?: string; githubUsername?: string; avatarUrl?: string }): Promise<User>;
  update(id: string, data: Partial<Pick<User, "email" | "name" | "passwordHash" | "googleId" | "githubId" | "githubUsername" | "avatarUrl">>): Promise<User | null>;
  count(): Promise<number>;
  listAll(): Promise<Omit<User, "passwordHash">[]>;
  adminUpdate(id: string, data: { role?: UserRole; disabled?: boolean }): Promise<User | null>;
  delete(id: string): Promise<void>;
}
