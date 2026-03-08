"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  disabled: boolean;
  createdAt: string;
};

export default function UserList({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateUser(id: string, data: { role?: string; disabled?: boolean }) {
    setPending(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Update failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={ui.card}>
      {error && <p className={`${ui.alertError} mb-4`}>{error}</p>}

      {users.length === 0 ? (
        <div className={ui.empty}>No users found.</div>
      ) : (
        <div className="divide-y divide-border">
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const isPending = pending === user.id;

            return (
              <div key={user.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{user.name}</span>
                    <span className={ui.badge}>{user.role}</span>
                    {user.disabled && (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                        disabled
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-xs text-text-muted">(you)</span>
                    )}
                  </div>
                  <p className={ui.muted}>{user.email}</p>
                </div>

                {!isSelf && (
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
                      value={user.role}
                      onChange={(e) => updateUser(user.id, { role: e.target.value })}
                      disabled={isPending}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      className={`${ui.btn} ${user.disabled ? ui.btnPrimary : ui.btnDanger} h-8 px-3 text-xs`}
                      onClick={() => updateUser(user.id, { disabled: !user.disabled })}
                      disabled={isPending}
                      type="button"
                    >
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
  );
}
