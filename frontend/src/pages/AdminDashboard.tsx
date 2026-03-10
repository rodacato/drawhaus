import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

        <p className={ui.muted}>Send an invitation email to add a new user to your Drawhaus instance.</p>

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

// --- Components ---

type TabId = "admin-overview" | "admin-users" | "admin-site" | "admin-style";

export function AdminOverview({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

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
        <button type="button" className={`${ui.btn} ${ui.btnPrimary} gap-2`} onClick={() => setInviteOpen(true)}>
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

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

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
        <button type="button" className={`${ui.btn} ${ui.btnPrimary} gap-2`} onClick={() => setInviteOpen(true)}>
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

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
