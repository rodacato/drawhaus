import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { FolderRepository } from "../../../domain/ports/folder-repository";
import type { Diagram } from "../../../domain/entities/diagram";
import { ForbiddenError, NotFoundError } from "../../../domain/errors";
import { requireAccess } from "../../helpers/require-access";
import { requirePlacement } from "../../helpers/require-placement";
import { withSceneContent } from "../../helpers/scene-content";

type Placement = { workspaceId: string | null; folderId: string | null };

export class DuplicateDiagramUseCase {
  constructor(
    private readonly diagramRepo: DiagramRepository,
    private readonly scenes: SceneRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly folders: FolderRepository,
  ) {}

  async execute(diagramId: string, userId: string): Promise<Diagram> {
    const original = await this.diagramRepo.findById(diagramId);
    if (!original) throw new NotFoundError("Diagram");
    const role = await this.diagramRepo.findAccessRole(diagramId, userId);
    requireAccess(role);
    const source = await withSceneContent(original, this.scenes);
    const placement = await this.resolvePlacement(original, userId);
    return this.diagramRepo.create({
      title: `${original.title} (copy)`,
      ownerId: userId,
      ...placement,
      elements: source.elements,
      appState: source.appState,
      thumbnail: original.thumbnail,
    });
  }

  private async resolvePlacement(original: Diagram, userId: string): Promise<Placement> {
    const repos = { workspaces: this.workspaces, folders: this.folders };
    const target = { userId, workspaceId: original.workspaceId };
    const candidates: Placement[] = [
      { workspaceId: original.workspaceId, folderId: original.folderId },
      { workspaceId: original.workspaceId, folderId: null },
    ];
    for (const candidate of candidates) {
      try {
        await requirePlacement(repos, target, candidate.folderId);
        return candidate;
      } catch (err) {
        if (!(err instanceof ForbiddenError)) throw err;
      }
    }
    return { workspaceId: null, folderId: null };
  }
}
