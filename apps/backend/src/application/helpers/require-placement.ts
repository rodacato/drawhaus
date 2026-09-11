import type { WorkspaceRepository } from "../../domain/ports/workspace-repository";
import type { FolderRepository } from "../../domain/ports/folder-repository";
import { ForbiddenError } from "../../domain/errors";
import {
  type PlacementTarget,
  canUseWorkspace,
  folderFitsTarget,
} from "../../domain/policies/access-policy";

export async function requireWorkspaceAccess(
  workspaces: WorkspaceRepository,
  target: PlacementTarget,
): Promise<void> {
  const role = target.workspaceId
    ? await workspaces.findMemberRole(target.workspaceId, target.userId)
    : null;
  if (!canUseWorkspace(target.workspaceId, role)) throw new ForbiddenError();
}

export async function requirePlacement(
  repos: { workspaces: WorkspaceRepository; folders: FolderRepository },
  target: PlacementTarget,
  folderId?: string | null,
): Promise<void> {
  await requireWorkspaceAccess(repos.workspaces, target);
  if (!folderId) return;
  const folder = await repos.folders.findById(folderId);
  if (!folder || !folderFitsTarget(folder, target)) throw new ForbiddenError();
}
