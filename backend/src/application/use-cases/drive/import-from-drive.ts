import type { GoogleDriveService } from "../../../domain/ports/google-drive-service";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { GoogleTokenRefresher } from "../../../infrastructure/services/google-token-refresh";
import { InvalidInputError } from "../../../domain/errors";

export class ImportFromDriveUseCase {
  constructor(
    private driveService: GoogleDriveService,
    private diagrams: DiagramRepository,
    private tokenRefresher: GoogleTokenRefresher,
  ) {}

  async execute(userId: string, data: { fileId: string; fileName: string }): Promise<{ diagramId: string; title: string }> {
    const accessToken = await this.tokenRefresher.getValidAccessToken(userId);

    // Download file content from Drive
    const content = await this.driveService.downloadFile(accessToken, data.fileId);

    // Parse as .excalidraw JSON
    let parsed: { elements?: unknown[]; appState?: Record<string, unknown> };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new InvalidInputError("File is not valid JSON. Only .excalidraw files can be imported.");
    }

    if (!Array.isArray(parsed.elements)) {
      throw new InvalidInputError("File does not contain valid Excalidraw elements.");
    }

    // Derive title from filename (strip .excalidraw extension)
    const title = data.fileName.replace(/\.excalidraw$/i, "") || "Imported Diagram";

    // Create a new diagram
    const diagram = await this.diagrams.create({
      ownerId: userId,
      title,
      elements: parsed.elements,
      appState: parsed.appState ?? {},
    });

    return { diagramId: diagram.id, title: diagram.title };
  }
}
