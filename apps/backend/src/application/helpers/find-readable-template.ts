import type { Template } from "../../domain/entities/template";
import type { TemplateRepository } from "../../domain/ports/template-repository";
import type { WorkspaceRepository } from "../../domain/ports/workspace-repository";
import { NotFoundError } from "../../domain/errors";
import { canReadTemplate } from "../../domain/policies/template-policy";

/** A template the user may not read is reported as missing, so its existence stays hidden. */
export async function findReadableTemplate(
  repos: { templates: TemplateRepository; workspaces: WorkspaceRepository },
  templateId: string,
  userId: string,
): Promise<Template> {
  const template = await repos.templates.findById(templateId);
  const role = template?.workspaceId
    ? await repos.workspaces.findMemberRole(template.workspaceId, userId)
    : null;
  if (!template || !canReadTemplate(template, userId, role)) throw new NotFoundError("Template");
  return template;
}
