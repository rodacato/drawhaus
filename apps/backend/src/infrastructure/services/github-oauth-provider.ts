import type { OAuthProviderPort, OAuthTokens, OAuthProfile } from "../../domain/ports/oauth-provider";
import { config } from "../config";

type GitHubTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
};

type GitHubUserInfo = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export class GitHubOAuthProvider implements OAuthProviderPort {
  get isEnabled(): boolean {
    return !!(config.githubClientId && config.githubClientSecret && config.githubRedirectUri);
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.githubClientId,
      redirect_uri: config.githubRedirectUri,
      scope: "read:user user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
        redirect_uri: config.githubRedirectUri,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub token exchange failed: ${body}`);
    }

    const data = (await response.json()) as GitHubTokenResponse & { error?: string };
    if (data.error) {
      throw new Error(`GitHub token exchange failed: ${data.error}`);
    }

    return { accessToken: data.access_token, scopes: data.scope };
  }

  async fetchUserInfo(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch GitHub user info");
    }

    const user = (await response.json()) as GitHubUserInfo;
    const email = user.email ?? (await this.fetchPrimaryEmail(accessToken));

    return {
      providerId: String(user.id),
      email,
      name: user.name,
      avatarUrl: user.avatar_url,
      username: user.login,
    };
  }

  private async fetchPrimaryEmail(accessToken: string): Promise<string | null> {
    const response = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const emails = (await response.json()) as GitHubEmail[];
    const primary = emails.find((e) => e.primary && e.verified);
    return primary?.email ?? null;
  }
}
