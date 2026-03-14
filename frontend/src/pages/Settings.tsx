import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/api/auth";
import { workspacesApi } from "@/api/workspaces";
import { ui } from "@/lib/ui";
import { AdminUsers } from "@/pages/AdminUsers";
import { AdminSettings as AdminSiteSettings } from "@/pages/AdminSettings";
import { AdminStyleGuide } from "@/pages/AdminStyleGuide";
import { AdminOverview } from "@/pages/AdminDashboard";
import { DriveIntegrationCard } from "@/components/DriveIntegrationCard";

type Tab = "profile" | "security" | "billing" | "preferences" | "integrations" | "admin-overview" | "admin-users" | "admin-site" | "admin-style";

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "profile";
  const { user, refreshUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [profilePending, setProfilePending] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<{ type: "error"; message: string } | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [ownedSharedWorkspaces, setOwnedSharedWorkspaces] = useState<{ id: string; name: string }[]>([]);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setSearchParams(tab === "profile" ? {} : { tab });
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfilePending(true);
    setProfileStatus(null);
    try {
      await authApi.updateProfile({ name: name.trim(), email: email.trim() });
      setProfileStatus({ type: "success", message: "Profile updated" });
      refreshUser();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Update failed";
      setProfileStatus({ type: "error", message: msg });
    } finally {
      setProfilePending(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordPending(true);
    setPasswordStatus(null);
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "Passwords do not match" });
      setPasswordPending(false);
      return;
    }
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordStatus({ type: "success", message: "Password changed" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Password change failed";
      setPasswordStatus({ type: "error", message: msg === "Unauthorized" ? "Current password is incorrect" : msg });
    } finally {
      setPasswordPending(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeletePending(true);
    setDeleteStatus(null);
    try {
      await authApi.deleteAccount(deletePassword);
      navigate("/login");
    } catch (err: unknown) {
      const resp = err as { response?: { data?: { error?: string }; status?: number } };
      const msg = resp?.response?.data?.error ?? "Account deletion failed";
      if (resp?.response?.status === 409) {
        // Conflict: user owns shared workspaces
        try {
          const data = await workspacesApi.listOwnedShared();
          setOwnedSharedWorkspaces(data.workspaces);
        } catch { /* ignore */ }
        setDeleteStatus({ type: "error", message: "You must transfer ownership of your shared workspaces before deleting your account." });
      } else {
        setDeleteStatus({ type: "error", message: msg === "Unauthorized" ? "Password is incorrect" : msg });
      }
    } finally {
      setDeletePending(false);
    }
  }

  const isAdmin = user?.role === "admin";

  const userTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "profile",
      label: "Profile",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    },
    {
      id: "security",
      label: "Security",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    },
    {
      id: "billing",
      label: "Billing",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
    },
    {
      id: "preferences",
      label: "Preferences",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    },
  ];

  const adminTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "admin-overview",
      label: "Overview",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
    },
    {
      id: "admin-users",
      label: "Users",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    },
    {
      id: "admin-site",
      label: "Site Settings",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    },
    {
      id: "admin-style",
      label: "Style Guide",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
    },
  ];

  function NavItem({ tab }: { tab: { id: Tab; label: string; icon: React.ReactNode } }) {
    return (
      <button
        onClick={() => switchTab(tab.id)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
          activeTab === tab.id
            ? "bg-primary/10 font-medium text-primary"
            : "text-text-secondary hover:bg-surface-raised"
        }`}
        type="button"
      >
        {tab.icon}
        {tab.label}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Settings</h1>
        <p className={ui.subtitle}>Manage your profile and security.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar navigation */}
        <nav className="w-48 shrink-0 flex flex-col gap-1">
          {userTabs.map((tab) => <NavItem key={tab.id} tab={tab} />)}

          {isAdmin && (
            <div className="mt-2 border-t border-border pt-2">
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-text-muted">Admin</p>
              {adminTabs.map((tab) => <NavItem key={tab.id} tab={tab} />)}
            </div>
          )}

          <div className="mt-2 border-t border-border pt-2">
            <button
              onClick={async () => { await logout(); navigate("/login"); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-danger transition hover:bg-danger/10"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              Log out
            </button>
          </div>
        </nav>

        {/* Content area */}
        <div className="flex-1 space-y-6">
          {activeTab === "profile" && (
            <div className={ui.card}>
              <h2 className={ui.h2}>Profile</h2>
              <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
                <label className={ui.label}>Full Name<input className={ui.input} type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></label>
                <label className={ui.label}>Email Address<input className={ui.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
                {profileStatus && <p className={profileStatus.type === "error" ? ui.alertError : ui.alertSuccess}>{profileStatus.message}</p>}
                <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={profilePending}>{profilePending ? "Saving..." : "Save Profile"}</button>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <>
              <div className={ui.card}>
                <h2 className={ui.h2}>Change Password</h2>
                <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
                  <label className={ui.label}>Current Password<input className={ui.input} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label>
                  <label className={ui.label}>New Password<input className={ui.input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} /></label>
                  <label className={ui.label}>Confirm New Password<input className={ui.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} /></label>
                  {passwordStatus && <p className={passwordStatus.type === "error" ? ui.alertError : ui.alertSuccess}>{passwordStatus.message}</p>}
                  <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={passwordPending}>{passwordPending ? "Changing..." : "Update Password"}</button>
                </form>
              </div>

              {/* Danger Zone */}
              <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
                <h2 className="text-lg font-semibold text-danger">Danger Zone</h2>
                <p className="mt-1 text-sm text-text-secondary">Once you delete your account, there is no going back. Please be certain.</p>
                {!deleteConfirmOpen ? (
                  <button type="button" className={`${ui.btn} ${ui.btnDanger} mt-4`} onClick={() => setDeleteConfirmOpen(true)}>Delete Account</button>
                ) : (
                  <form onSubmit={handleDeleteAccount} className="mt-4 space-y-3">
                    <p className="text-sm font-medium text-danger">Enter your password to confirm account deletion:</p>
                    <input className={ui.input} type="password" placeholder="Your password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} required autoFocus />
                    {deleteStatus && <p className={ui.alertError}>{deleteStatus.message}</p>}
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
                      <button type="submit" className={`${ui.btn} ${ui.btnDanger}`} disabled={deletePending}>{deletePending ? "Deleting..." : "Permanently Delete"}</button>
                      <button type="button" className={`${ui.btn} ${ui.btnSecondary}`} onClick={() => { setDeleteConfirmOpen(false); setDeletePassword(""); setDeleteStatus(null); }}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}

          {activeTab === "billing" && (
            <div className={ui.card}>
              <div className="flex items-center gap-2 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                <h2 className={ui.h2}>Billing & Plan</h2>
              </div>
              <div className="rounded-xl border border-border bg-surface p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-text-primary">Self-Hosted Instance</h3>
                <p className="mt-2 text-sm text-text-secondary">You are running Drawhaus on your own infrastructure. No billing information required.</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Community Edition — Free forever
                </div>
              </div>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6">
              <div>
                <h2 className={ui.h2}>Integrations</h2>
                <p className={`${ui.muted} mt-1`}>Connect external services to enhance your workflow.</p>
              </div>
              <DriveIntegrationCard />
            </div>
          )}

          {activeTab === "preferences" && (
            <div className={ui.card}>
              <h2 className={ui.h2}>Appearance</h2>
              <p className={`${ui.muted} mt-1`}>Choose how Drawhaus looks for you.</p>
              <div className="mt-4 flex gap-3">
                {(["light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                      theme === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-text-secondary hover:border-primary/50"
                    }`}
                    type="button"
                  >
                    {t === "light" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                    )}
                    {t === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Admin tabs */}
          {activeTab === "admin-overview" && <AdminOverview onNavigate={switchTab} />}
          {activeTab === "admin-users" && <AdminUsers />}
          {activeTab === "admin-site" && <AdminSiteSettings />}
          {activeTab === "admin-style" && <AdminStyleGuide />}
        </div>
      </div>
    </div>
  );
}
