import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { Scene } from "../../../domain/entities/scene";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { ShareRepository } from "../../../domain/ports/share-repository";
import { isShareLinkExpired } from "../../../domain/entities/share-link";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export type SceneWriter = { kind: "user"; userId: string } | { kind: "guest"; shareToken: string };

export type SaveSceneResult = { status: "saved" } | { status: "stale"; scene: Scene };

export class SaveSceneUseCase {
  constructor(
    private readonly scenes: SceneRepository,
    private readonly diagrams: DiagramRepository,
    private readonly shares: ShareRepository,
  ) {}

  /** A socket's role is cached at join; the credential behind it may have been demoted, removed or expired since. */
  async assertCanEdit(diagramId: string, writer: SceneWriter): Promise<void> {
    if (writer.kind === "user") {
      const role = await this.diagrams.findAccessRole(diagramId, writer.userId);
      if (role !== "owner" && role !== "editor") throw new ForbiddenError();
      return;
    }
    const link = await this.shares.findByToken(writer.shareToken);
    if (
      !link ||
      link.diagramId !== diagramId ||
      link.role !== "editor" ||
      isShareLinkExpired(link)
    ) {
      throw new ForbiddenError();
    }
  }

  /**
   * Merges a client's copy into the stored scene. A copy based on an older `revision` was
   * computed before a restore or a content PATCH replaced the scene, and merging it would bring
   * back what that replace removed; it is refused and the caller gets the current scene instead.
   * A save without a revision, from a client older than ADR-026, is merged unchecked.
   */
  async execute(
    diagramId: string,
    sceneId: string,
    elements: unknown[],
    appState: Record<string, unknown>,
    revision?: number,
  ): Promise<SaveSceneResult> {
    const result = await this.scenes.updateSceneMerged(
      sceneId,
      diagramId,
      elements,
      appState,
      revision,
    );
    if (result === "saved") return { status: "saved" };
    const current = result === "stale" ? await this.scenes.findById(sceneId) : null;
    if (!current) throw new NotFoundError("Scene");
    return { status: "stale", scene: current };
  }
}
