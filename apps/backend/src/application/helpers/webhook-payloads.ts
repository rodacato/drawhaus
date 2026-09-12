import type { Diagram } from "../../domain/entities/diagram";
import type { ShareLink } from "../../domain/entities/share-link";
import type { Template } from "../../domain/entities/template";

/** Metadata only — a scene's elements can run to megabytes and no subscriber asked for them. */
export function diagramEventData(diagram: Diagram): Record<string, unknown> {
  return {
    id: diagram.id,
    title: diagram.title,
    ownerId: diagram.ownerId,
    workspaceId: diagram.workspaceId,
    folderId: diagram.folderId,
    createdVia: diagram.createdVia,
    createdAt: diagram.createdAt.toISOString(),
    updatedAt: diagram.updatedAt.toISOString(),
  };
}

/** The link's token is its capability, so it is named but never sent (ADR-029). */
export function shareLinkEventData(link: ShareLink): Record<string, unknown> {
  return {
    diagramId: link.diagramId,
    role: link.role,
    createdBy: link.createdBy,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    createdAt: link.createdAt.toISOString(),
  };
}

export function templateEventData(template: Template): Record<string, unknown> {
  return {
    id: template.id,
    title: template.title,
    category: template.category,
    creatorId: template.creatorId,
    workspaceId: template.workspaceId,
    createdAt: template.createdAt.toISOString(),
  };
}
