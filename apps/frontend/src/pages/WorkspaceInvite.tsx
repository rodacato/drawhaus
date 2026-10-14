import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { workspacesApi } from "@/api/workspaces";
import { useAuth } from "@/contexts/AuthContext";
import { ui } from "@/lib/ui";

export function WorkspaceInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workspaceName, setWorkspaceName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    workspacesApi
      .resolveInvite(token)
      .then((data) => {
        setWorkspaceName(data.workspaceName);
        setRole(data.role);
      })
      .catch((err) => {
        setError(
          err.response?.status === 410 ? "This invitation has expired." : "Invitation not found.",
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    if (!user) {
      // Redirect to login/register with return URL
      navigate(`/login?redirect=/workspace-invite/${token}`);
      return;
    }
    setAccepting(true);
    try {
      await workspacesApi.acceptInvite(token);
      navigate("/dashboard");
    } catch {
      setError("Failed to accept invitation.");
    }
    setAccepting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-text-muted">
        Loading...
      </div>
    );
  }

  const acceptLabel = user ? "Accept Invitation" : "Log in to Accept";

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-8">
      <div className={`${ui.card} w-full max-w-md text-center`}>
        {error ? (
          <>
            <h1 className={`${ui.h1} mb-2`}>Oops</h1>
            <p className="mb-6 text-text-secondary">{error}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className={`${ui.btn} ${ui.btnPrimary}`}
              type="button"
            >
              Go to Dashboard
            </button>
          </>
        ) : (
          <>
            <h1 className={`${ui.h1} mb-2`}>Workspace Invitation</h1>
            <p className="mb-6 text-text-secondary">
              You've been invited to join{" "}
              <strong className="text-text-primary">{workspaceName}</strong> as{" "}
              <strong className="text-text-primary capitalize">{role}</strong>.
            </p>
            {!user && (
              <p className="mb-4 text-sm text-text-muted">
                You'll need to log in or create an account to accept.
              </p>
            )}
            <button
              onClick={handleAccept}
              disabled={accepting}
              className={`${ui.btn} ${ui.btnPrimary}`}
              type="button"
            >
              {accepting ? "Accepting..." : acceptLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
