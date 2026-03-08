import { useEffect, useState } from "react";
import { adminApi } from "@/api/admin";
import { useAuth } from "@/contexts/AuthContext";
import { ui } from "@/lib/ui";

type AdminUser = { id: string; email: string; name: string; role: "user" | "admin"; disabled: boolean; createdAt: string };

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
      <div>
        <h1 className={ui.h1}>Users</h1>
        <p className={ui.subtitle}>Manage user roles and access.</p>
      </div>
      <div className={ui.card}>
        {error && <p className={`${ui.alertError} mb-4`}>{error}</p>}
        {users.length === 0 ? (
          <div className={ui.empty}>No users found.</div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((user) => {
              const isSelf = user.id === currentUser?.id;
              const isPending = pending === user.id;
              return (
                <div key={user.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{user.name}</span>
                      <span className={ui.badge}>{user.role}</span>
                      {user.disabled && <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">disabled</span>}
                      {isSelf && <span className="text-xs text-text-muted">(you)</span>}
                    </div>
                    <p className={ui.muted}>{user.email}</p>
                  </div>
                  {!isSelf && (
                    <div className="flex items-center gap-2">
                      <select className="rounded-lg border border-border bg-surface px-2 py-1 text-sm" value={user.role} onChange={(e) => updateUser(user.id, { role: e.target.value })} disabled={isPending}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                      <button className={`${ui.btn} ${user.disabled ? ui.btnPrimary : ui.btnDanger} h-8 px-3 text-xs`} onClick={() => updateUser(user.id, { disabled: !user.disabled })} disabled={isPending} type="button">
                        {isPending ? "..." : user.disabled ? "Enable" : "Disable"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
