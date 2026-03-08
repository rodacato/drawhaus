import type { Session } from "../entities/session";
import type { UserRole } from "../entities/user";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  disabled: boolean;
};

export interface SessionRepository {
  create(userId: string): Promise<Session>;
  findUserByToken(token: string): Promise<AuthUser | null>;
  delete(token: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
}
