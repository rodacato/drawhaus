import type { Folder } from "../entities/folder";
import type { WorkspaceRole } from "../entities/workspace";

/** Where new content is being placed: a workspace, or the user's personal space when null. */
export type PlacementTarget = { userId: string; workspaceId: string | null };

export function canUseWorkspace(
  workspaceId: string | null,
  memberRole: WorkspaceRole | null,
): boolean {
  return workspaceId === null || memberRole !== null;
}

export function folderFitsTarget(folder: Folder, target: PlacementTarget): boolean {
  return target.workspaceId === null
    ? folder.ownerId === target.userId
    : folder.workspaceId === target.workspaceId;
}
