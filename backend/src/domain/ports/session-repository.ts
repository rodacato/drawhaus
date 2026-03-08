import type { Session } from "../entities/session";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export interface SessionRepository {
  create(userId: string): Promise<Session>;
  findUserByToken(token: string): Promise<AuthUser | null>;
  delete(token: string): Promise<void>;
}
