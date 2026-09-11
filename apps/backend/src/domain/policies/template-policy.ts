import type { Template } from "../entities/template";
import type { WorkspaceRole } from "../entities/workspace";

/** Readers: the creator, plus every member of a workspace template's workspace. */
export function canReadTemplate(
  template: Pick<Template, "creatorId" | "workspaceId">,
  userId: string,
  roleInTemplateWorkspace: WorkspaceRole | null,
): boolean {
  if (template.creatorId === userId) return true;
  return template.workspaceId !== null && roleInTemplateWorkspace !== null;
}
