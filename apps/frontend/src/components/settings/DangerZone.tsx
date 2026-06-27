import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth";
import { workspacesApi } from "@/api/workspaces";
import { ui } from "@/lib/ui";
import { getErrorMessage } from "@/lib/api-error";

export function DangerZone() {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ type: "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [ownedSharedWorkspaces, setOwnedSharedWorkspaces] = useState<{ id: string; name: string }[]>([]);

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      await authApi.deleteAccount(password);
      navigate("/login");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = getErrorMessage(err, "Account deletion failed");
      if (status === 409) {
        try {
          const data = await workspacesApi.listOwnedShared();
          setOwnedSharedWorkspaces(data.workspaces);
        } catch { /* ignore */ }
        setStatus({ type: "error", message: "You must transfer ownership of your shared workspaces before deleting your account." });
      } else {
        setStatus({ type: "error", message: msg === "Unauthorized" ? "Password is incorrect" : msg });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
      <h2 className="text-lg font-semibold text-danger">Danger Zone</h2>
      <p className="mt-1 text-sm text-text-secondary">Once you delete your account, there is no going back. Please be certain.</p>
      {!confirmOpen ? (
        <button type="button" className={`${ui.btn} ${ui.btnDanger} mt-4`} onClick={() => setConfirmOpen(true)}>Delete Account</button>
      ) : (
        <form onSubmit={handleDeleteAccount} className="mt-4 space-y-3">
          <p className="text-sm font-medium text-danger">Enter your password to confirm account deletion:</p>
          <input className={ui.input} type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
          {status && <p className={ui.alertError}>{status.message}</p>}
          {ownedSharedWorkspaces.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-text-secondary">
              <p className="font-medium text-warning mb-1">Workspaces that need ownership transfer:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {ownedSharedWorkspaces.map((ws) => <li key={ws.id}>{ws.name}</li>)}
              </ul>
              <p className="mt-2 text-xs">Go to each workspace's settings to transfer ownership before deleting your account.</p>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" className={`${ui.btn} ${ui.btnDanger}`} disabled={pending}>{pending ? "Deleting..." : "Permanently Delete"}</button>
            <button type="button" className={`${ui.btn} ${ui.btnSecondary}`} onClick={() => { setConfirmOpen(false); setPassword(""); setStatus(null); }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
