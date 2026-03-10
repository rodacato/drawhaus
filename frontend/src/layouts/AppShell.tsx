import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ui } from "@/lib/ui";

export function AppShell() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <>
      <header className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <img src="/logo-icon.svg" alt="" className="h-7 w-7" />
            <span className="font-[family-name:var(--font-family-heading)] text-sm font-semibold tracking-tight text-text-primary">
              Drawhaus
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-text-secondary hover:text-primary transition-colors">
              Dashboard
            </Link>
            <Link to="/settings" className="text-sm text-text-secondary hover:text-primary transition-colors">
              Settings
            </Link>
            {user?.role === "admin" && (
              <Link to="/admin" className="text-sm text-text-secondary hover:text-primary transition-colors">
                Admin
              </Link>
            )}
            <span className={ui.badge}>{user?.email}</span>
            <button
              className={`${ui.btn} ${ui.btnSecondary} h-8 px-3 text-xs`}
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className={`${ui.page} ${ui.center}`}>
        <Outlet />
      </main>
    </>
  );
}
