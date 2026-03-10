import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "@/api/admin";
import { ui } from "@/lib/ui";

type Metrics = { totalUsers: number; totalDiagrams: number; activeSessions: number };

const metricCards = [
  {
    key: "totalUsers" as const,
    label: "Total Users",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    key: "totalDiagrams" as const,
    label: "Total Diagrams",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>,
    color: "text-accent-coral",
    bg: "bg-accent-coral/10",
  },
  {
    key: "activeSessions" as const,
    label: "Active Sessions",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    color: "text-success",
    bg: "bg-success/10",
  },
];

type TabId = "admin-overview" | "admin-users" | "admin-site" | "admin-style";

export function AdminOverview({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    adminApi.getMetrics().then((data) => setMetrics(data.metrics ?? data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Admin Dashboard</h1>
          <p className={ui.subtitle}>Welcome back. Here is what is happening with your Drawhaus instance today.</p>
        </div>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary} gap-2`} onClick={() => onNavigate("admin-users")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Invite User
        </button>
      </div>
      {metrics && (
        <div className="grid grid-cols-3 gap-4">
          {metricCards.map((card) => (
            <div key={card.key} className={`${ui.card} group relative overflow-hidden`}>
              <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/5 transition-colors group-hover:bg-primary/10" />
              <div className="relative z-10">
                <div className={`mb-2 ${card.color}`}>{card.icon}</div>
                <p className={ui.muted}>{card.label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-text-primary">{metrics[card.key].toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onNavigate("admin-users")} className={`${ui.card} block text-left hover:border-primary transition-colors`} type="button">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div>
              <h2 className={ui.h2}>Users</h2>
              <p className={ui.muted}>Manage users, roles, and access.</p>
            </div>
          </div>
        </button>
        <button onClick={() => onNavigate("admin-site")} className={`${ui.card} block text-left hover:border-primary transition-colors`} type="button">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-coral/10 text-accent-coral">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </div>
            <div>
              <h2 className={ui.h2}>Site Settings</h2>
              <p className={ui.muted}>Registration, instance name, and more.</p>
            </div>
          </div>
        </button>
        <button onClick={() => onNavigate("admin-style")} className={`${ui.card} block text-left hover:border-primary transition-colors`} type="button">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-yellow/10 text-accent-yellow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
            </div>
            <div>
              <h2 className={ui.h2}>Style Guide</h2>
              <p className={ui.muted}>Brand colors, typography, logos, and UI components.</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    adminApi.getMetrics().then((data) => setMetrics(data.metrics ?? data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Admin Dashboard</h1>
          <p className={ui.subtitle}>Welcome back. Here is what is happening with your Drawhaus instance today.</p>
        </div>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary} gap-2`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Invite User
        </button>
      </div>
      {metrics && (
        <div className="grid grid-cols-3 gap-4">
          {metricCards.map((card) => (
            <div key={card.key} className={`${ui.card} group relative overflow-hidden`}>
              <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/5 transition-colors group-hover:bg-primary/10" />
              <div className="relative z-10">
                <div className={`mb-2 ${card.color}`}>{card.icon}</div>
                <p className={ui.muted}>{card.label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-text-primary">{metrics[card.key].toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/admin/users" className={`${ui.card} block hover:border-primary transition-colors`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div>
              <h2 className={ui.h2}>Users</h2>
              <p className={ui.muted}>Manage users, roles, and access.</p>
            </div>
          </div>
        </Link>
        <Link to="/admin/settings" className={`${ui.card} block hover:border-primary transition-colors`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-coral/10 text-accent-coral">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </div>
            <div>
              <h2 className={ui.h2}>Site Settings</h2>
              <p className={ui.muted}>Registration, instance name, and more.</p>
            </div>
          </div>
        </Link>
        <Link to="/admin/style-guide" className={`${ui.card} block hover:border-primary transition-colors`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-yellow/10 text-accent-yellow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
            </div>
            <div>
              <h2 className={ui.h2}>Style Guide</h2>
              <p className={ui.muted}>Brand colors, typography, logos, and UI components.</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
