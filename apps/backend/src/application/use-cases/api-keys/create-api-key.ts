import crypto from "node:crypto";
import type { ApiKeyRepository } from "../../../domain/ports/api-key-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { ConflictError } from "../../../domain/errors";
import { ForbiddenError } from "../../../domain/errors";

const MAX_ACTIVE_KEYS_PER_USER = 10;

export class CreateApiKeyUseCase {
  constructor(
    private apiKeys: ApiKeyRepository,
    private workspaces: WorkspaceRepository,
  ) {}

  async execute(input: {
    userId: string;
    workspaceId: string;
    name: string;
    expiresAt?: Date | null;
  }) {
    // Verify user is a member of the workspace
    const role = await this.workspaces.findMemberRole(input.workspaceId, input.userId);
    if (!role) {
      throw new ForbiddenError();
    }

    // Check active key limit
    const activeCount = await this.apiKeys.countActiveByUser(input.userId);
    if (activeCount >= MAX_ACTIVE_KEYS_PER_USER) {
      throw new ConflictError(`Maximum of ${MAX_ACTIVE_KEYS_PER_USER} active API keys allowed`);
    }

    // Generate key: dhk_ + 32 random bytes in base64url
    const plainKey = "dhk_" + crypto.randomBytes(32).toString("base64url");
    const keyHash = crypto.createHash("sha256").update(plainKey).digest("hex");
    const keyPrefix = plainKey.slice(0, 10);

    const apiKey = await this.apiKeys.create({
      userId: input.userId,
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      keyPrefix,
      keyHash,
      expiresAt: input.expiresAt ?? null,
    });

    return { apiKey, plainKey };
  }
}
