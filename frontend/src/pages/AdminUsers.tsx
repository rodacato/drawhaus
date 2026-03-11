import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { adminApi } from "@/api/admin";
import { useAuth } from "@/contexts/AuthContext";
import { ui } from "@/lib/ui";
import { ToggleSwitch } from "@/components/ToggleSwitch";

// --- Invite User Modal ---

function InviteUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [role, setRole] = useState("user");

  useEffect(() => {
    if (!open) { setStatus(null); setRole("user"); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    try {
      await adminApi.inviteUser(email, role);
      setStatus({ type: "success", message: `Invitation sent to ${email}` });
      (event.target as HTMLFormElement).reset();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to send invitation";
      setStatus({ type: "error", message: msg });
    } finally {
      setPending(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`${ui.card} relative z-10 w-full max-w-md space-y-5 shadow-2xl`}>
        <div className="flex items-center justify-between">
          <h2 className={ui.h2}>Invite User</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-text-muted hover:text-text-primary transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <p className={ui.muted}>Send an invitation email. This link works even when public registration is disabled.</p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className={ui.label}>
            <span>Email address</span>
            <input className={ui.input} type="email" name="email" placeholder="colleague@company.com" required />
          </label>
          <label className={ui.label}>
            <span>Role</span>
            <select
              className={ui.input}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {status && (
            <p className={status.type === "error" ? ui.alertError : ui.alertSuccess}>
              {status.message}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={`${ui.btn} ${ui.btnSecondary}`}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={`${ui.btn} ${ui.btnPrimary} gap-2`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
              {pending ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

type AdminUser = { id: string; email: string; name: string; role: "user" | "admin"; disabled: boolean; createdAt: string };

const roleBadgeColors: Record<string, string> = {
  admin: "bg-primary/10 text-primary ring-primary/20",
  user: "bg-surface text-text-secondary ring-border",
  editor: "bg-accent-coral/10 text-accent-coral ring-accent-coral/20",
  viewer: "bg-accent-yellow/10 text-accent-yellow ring-accent-yellow/20",
};

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    adminApi.listUsers().then((data) => setUsers(data.users ?? [])).catch(() => {});
  }, []);

  async function updateUser(id: string, data: { role?: string; disabled?: boolean }) {
    setPending(id);
    setError(null);
    try {
      await adminApi.updateUser(id, data);
      const res = await adminApi.listUsers();
      setUsers(res.users ?? []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Update failed";
      setError(msg);
    } finally {
      setPending(null);
    }
  }

  async function deleteUser(id: string) {
    setDeleting(true);
    setError(null);
    try {
      await adminApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Delete failed";
      setError(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={ui.h1}>User Management</h1>
          <p className={ui.subtitle}>Manage user roles and access.</p>
        </div>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary} gap-2`} onClick={() => setInviteOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Invite User
        </button>
      </div>
      <div className={ui.card}>
        {error && <p className={`${ui.alertError} mb-4`}>{error}</p>}
        {users.length === 0 ? (
          <div className={ui.empty}>No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-medium text-text-muted">Name</th>
                  <th className="pb-3 font-medium text-text-muted">Email</th>
                  <th className="pb-3 font-medium text-text-muted">Role</th>
                  <th className="pb-3 font-medium text-text-muted">Status</th>
                  <th className="pb-3 font-medium text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const isPending = pending === user.id;
                  const badgeColor = roleBadgeColors[user.role] ?? roleBadgeColors.user;
                  return (
                    <tr key={user.id} className="transition hover:bg-surface/50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <span className="font-medium text-text-primary">
                            {user.name}
                            {isSelf && <span className="ml-1.5 text-xs text-text-muted">(you)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-text-secondary">{user.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${badgeColor}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {!isSelf ? (
                          <ToggleSwitch
                            checked={!user.disabled}
                            onChange={(enabled) => updateUser(user.id, { disabled: !enabled })}
                            disabled={isPending}
                          />
                        ) : (
                          <span className="text-xs text-text-muted">Active</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {!isSelf && (
                            <select
                              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-primary transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                              value={user.role}
                              onChange={(e) => updateUser(user.id, { role: e.target.value })}
                              disabled={isPending}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                          {!isSelf && user.role !== "admin" && (
                            <button
                              type="button"
                              title="Delete user"
                              className="rounded-lg p-1.5 text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                              onClick={() => setDeleteTarget(user)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />

      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className={`${ui.card} relative z-10 w-full max-w-sm space-y-4 shadow-2xl`}>
            <h2 className={ui.h2}>Delete User</h2>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.email})?
              All their diagrams, folders, and data will be permanently removed.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className={`${ui.btn} ${ui.btnSecondary}`}>
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                className={`${ui.btn} bg-red-600 text-white hover:bg-red-700 transition-colors`}
                onClick={() => deleteUser(deleteTarget.id)}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
