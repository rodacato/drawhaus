import type { TokenRefresherPort } from "../../domain/ports/token-refresher";
import { DriveTokenError } from "../../domain/errors";

export class FakeTokenRefresher implements TokenRefresherPort {
  tokenByUser = new Map<string, string>();

  setToken(userId: string, token: string): void {
    this.tokenByUser.set(userId, token);
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const token = this.tokenByUser.get(userId);
    if (!token) throw new DriveTokenError();
    return token;
  }
}
