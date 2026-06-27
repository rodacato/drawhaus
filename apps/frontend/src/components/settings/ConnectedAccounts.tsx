import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/api/auth";
import { ui } from "@/lib/ui";
import { getErrorMessage } from "@/lib/api-error";

const API_URL = import.meta.env.VITE_API_URL ?? "";

type Provider = "google" | "github";

export function ConnectedAccounts() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [unlinkPending, setUnlinkPending] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const linked = searchParams.get("linked");
    const linkError = searchParams.get("link_error");
    if (linked) {
      setLinkStatus({ type: "success", message: `${linked === "google" ? "Google" : "GitHub"} account linked successfully` });
      refreshUser();
      const params = new URLSearchParams(searchParams);
      params.delete("linked");
      setSearchParams(params);
    } else if (linkError) {
      setLinkStatus({ type: "error", message: `Failed to link ${linkError === "google" ? "Google" : "GitHub"} account` });
      const params = new URLSearchParams(searchParams);
      params.delete("link_error");
      setSearchParams(params);
    }
  }, []);

  async function handleUnlinkProvider(provider: Provider) {
    setUnlinkPending(provider);
    setLinkStatus(null);
    try {
      await authApi.unlinkProvider(provider);
      setLinkStatus({ type: "success", message: `${provider === "google" ? "Google" : "GitHub"} account disconnected` });
      refreshUser();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to disconnect account");
      setLinkStatus({ type: "error", message: msg });
    } finally {
      setUnlinkPending(null);
    }
  }

  const linkedProvidersCount = user?.linkedProviders?.length ?? 0;
  const passwordCount = user?.hasPassword ? 1 : 0;
  const isLastSignInMethod = linkedProvidersCount + passwordCount <= 1;
  const lastMethodWarning = isLastSignInMethod ? "Cannot disconnect your only sign-in method" : undefined;

  return (
    <div className={ui.card}>
      <h2 className={ui.h2}>Connected Accounts</h2>
      <p className={`${ui.muted} mt-1`}>Link your social accounts for easier sign-in.</p>
      {linkStatus && <p className={`mt-3 ${linkStatus.type === "error" ? ui.alertError : ui.alertSuccess}`}>{linkStatus.message}</p>}
      <div className="mt-4 space-y-3">
        {/* Google */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <div>
              <p className="text-sm font-medium text-text-primary">Google</p>
              <p className="text-xs text-text-muted">
                {user?.linkedProviders?.includes("google") ? user.email : "Not connected"}
              </p>
            </div>
          </div>
          {user?.linkedProviders?.includes("google") ? (
            <button
              type="button"
              className={`${ui.btn} ${ui.btnSecondary} text-xs`}
              disabled={unlinkPending === "google" || isLastSignInMethod}
              title={lastMethodWarning}
              onClick={() => handleUnlinkProvider("google")}
            >
              {unlinkPending === "google" ? "Disconnecting..." : "Disconnect"}
            </button>
          ) : (
            <a href={`${API_URL}/api/auth/link/google`} className={`${ui.btn} ${ui.btnSecondary} text-xs`}>
              Connect
            </a>
          )}
        </div>

        {/* GitHub */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            <div>
              <p className="text-sm font-medium text-text-primary">GitHub</p>
              <p className="text-xs text-text-muted">
                {user?.linkedProviders?.includes("github") ? `@${user.githubUsername ?? "connected"}` : "Not connected"}
              </p>
            </div>
          </div>
          {user?.linkedProviders?.includes("github") ? (
            <button
              type="button"
              className={`${ui.btn} ${ui.btnSecondary} text-xs`}
              disabled={unlinkPending === "github" || isLastSignInMethod}
              title={lastMethodWarning}
              onClick={() => handleUnlinkProvider("github")}
            >
              {unlinkPending === "github" ? "Disconnecting..." : "Disconnect"}
            </button>
          ) : (
            <a href={`${API_URL}/api/auth/link/github`} className={`${ui.btn} ${ui.btnSecondary} text-xs`}>
              Connect
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
