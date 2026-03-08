export type UserRole = "user" | "admin";

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  disabled: boolean;
  createdAt: Date;
};
