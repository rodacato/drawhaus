import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { workspacesApi } from "@/api/workspaces";
import { useAuth } from "@/contexts/AuthContext";

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
    workspacesApi.resolveInvite(token)
      .then((data) => {
        setWorkspaceName(data.workspaceName);
        setRole(data.role);
      })
      .catch((err) => {
        setError(err.response?.status === 410 ? "This invitation has expired." : "Invitation not found.");
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
    return <div className="flex h-screen items-center justify-center bg-surface text-sm text-text-muted">Loading...</div>;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface-raised p-8 text-center">
        {error ? (
          <>
            <h1 className="mb-2 text-xl font-bold text-text-primary">Oops</h1>
            <p className="mb-6 text-text-secondary">{error}</p>
            <button onClick={() => navigate("/dashboard")} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white" type="button">
              Go to Dashboard
            </button>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-bold text-text-primary">Workspace Invitation</h1>
            <p className="mb-6 text-text-secondary">
              You've been invited to join <strong className="text-text-primary">{workspaceName}</strong> as <strong className="text-text-primary capitalize">{role}</strong>.
            </p>
            {!user && (
              <p className="mb-4 text-sm text-text-muted">You'll need to log in or create an account to accept.</p>
            )}
            <button onClick={handleAccept} disabled={accepting} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover" type="button">
              {accepting ? "Accepting..." : user ? "Accept Invitation" : "Log in to Accept"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
