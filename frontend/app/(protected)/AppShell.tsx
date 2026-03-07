"use client";

import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth";
import { ui } from "@/lib/ui";

export function AppShell({ user }: { user: AuthUser }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-surface-raised">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="text-sm font-semibold tracking-tight text-text-primary">
          Drawhaus
        </span>
        <div className="flex items-center gap-3">
          <span className={ui.badge}>{user.email}</span>
          <button
            className={`${ui.btn} ${ui.btnSecondary} h-8 px-3 text-xs`}
            onClick={logout}
            type="button"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
