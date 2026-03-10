import { useEffect, useState } from "react";
import { adminApi } from "@/api/admin";
import { useAuth } from "@/contexts/AuthContext";
import { ui } from "@/lib/ui";
import { ToggleSwitch } from "@/components/ToggleSwitch";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={ui.h1}>User Management</h1>
          <p className={ui.subtitle}>Manage user roles and access.</p>
        </div>
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
