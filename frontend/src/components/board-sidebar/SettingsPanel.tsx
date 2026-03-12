import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function SettingsPanel({ userEmail, onDashboardClick }: { userEmail: string; onDashboardClick: () => void }) {
  const { logout } = useAuth();

  return (
    <div className="space-y-3">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Account</h3>
      <div className="rounded-lg bg-gray-50 px-3 py-2.5">
        <p className="truncate text-sm font-medium text-gray-900">{userEmail}</p>
      </div>
      <button type="button" onClick={onDashboardClick} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
        Dashboard
      </button>
      <Link to="/settings" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        Settings
      </Link>
      <div className="border-t border-gray-100 pt-2">
        <button onClick={() => logout()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          Logout
        </button>
      </div>
    </div>
  );
}
