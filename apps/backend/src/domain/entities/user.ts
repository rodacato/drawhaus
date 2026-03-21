export type UserRole = "user" | "admin";

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  role: UserRole;
  disabled: boolean;
  googleId: string | null;
  githubId: string | null;
  githubUsername: string | null;
  avatarUrl: string | null;
  createdAt: Date;
};
