import { NotFoundError, ForbiddenError } from "../../domain/errors";

/** Throws NotFoundError if role is null (no access at all). Returns the role. */
export function requireAccess(role: string | null, resource = "Diagram"): string {
  if (!role) throw new NotFoundError(resource);
  return role;
}

/** Throws NotFoundError if null, ForbiddenError if viewer-only. */
export function requireEditAccess(role: string | null, resource = "Diagram"): string {
  if (!role) throw new NotFoundError(resource);
  if (role === "viewer") throw new ForbiddenError();
  return role;
}

/** Throws NotFoundError if null, ForbiddenError if not owner. */
export function requireOwnerAccess(role: string | null, resource = "Diagram"): string {
  if (!role) throw new NotFoundError(resource);
  if (role !== "owner") throw new ForbiddenError();
  return role;
}

/** Throws ForbiddenError if role is null (workspace membership check). */
export function requireMembership(role: string | null): string {
  if (!role) throw new ForbiddenError();
  return role;
}
