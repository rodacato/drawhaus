export type OAuthToken = {
  id: string;
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  scopes: string;
  createdAt: Date;
  updatedAt: Date;
};
