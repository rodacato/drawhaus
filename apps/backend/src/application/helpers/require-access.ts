import { NotFoundError, ForbiddenError } from "../../domain/errors";

/** Throws NotFoundError if role is null (no access at all). Returns the role. */
export function requireAccess<T extends string>(role: T | null, resource = "Diagram"): T {
  if (!role) throw new NotFoundError(resource);
  return role;
}

/** Throws NotFoundError if null, ForbiddenError if viewer-only. */
export function requireEditAccess<T extends string>(role: T | null, resource = "Diagram"): T {
  if (!role) throw new NotFoundError(resource);
  if (role === "viewer") throw new ForbiddenError();
  return role;
}

/** Throws NotFoundError if null, ForbiddenError if not owner. */
export function requireOwnerAccess<T extends string>(role: T | null, resource = "Diagram"): T {
  if (!role) throw new NotFoundError(resource);
  if (role !== "owner") throw new ForbiddenError();
  return role;
}

/** Throws ForbiddenError if role is null (workspace membership check). */
export function requireMembership<T extends string>(role: T | null): T {
  if (!role) throw new ForbiddenError();
  return role;
}
