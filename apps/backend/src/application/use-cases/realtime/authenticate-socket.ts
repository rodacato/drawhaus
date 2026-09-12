import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { ShareRepository } from "../../../domain/ports/share-repository";
import { isShareLinkExpired } from "../../../domain/entities/share-link";

export type SocketCredentials = { sessionToken: string | null; shareToken: string | null };

/**
 * Admission only: room identity and role are still decided by join-room / join-room-guest.
 * It names the credential so the socket can be closed when that credential is revoked.
 */
export type SocketAdmission =
  | { via: "session"; sessionToken: string; userId: string }
  | { via: "share-link"; shareToken: string };

export class AuthenticateSocketUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly shares: ShareRepository,
  ) {}

  async execute({ sessionToken, shareToken }: SocketCredentials): Promise<SocketAdmission | null> {
    if (sessionToken) {
      const user = await this.sessions.findUserByToken(sessionToken);
      if (user && !user.disabled) return { via: "session", sessionToken, userId: user.id };
    }
    if (shareToken) {
      const link = await this.shares.findByToken(shareToken);
      if (link && !isShareLinkExpired(link)) return { via: "share-link", shareToken };
    }
    return null;
  }
}
