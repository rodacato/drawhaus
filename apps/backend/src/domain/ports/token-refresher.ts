export interface TokenRefresherPort {
  getValidAccessToken(userId: string): Promise<string>;
}
