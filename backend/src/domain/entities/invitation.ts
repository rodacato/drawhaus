import type { UserRole } from "./user";

export type Invitation = {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};
