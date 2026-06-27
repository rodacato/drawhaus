import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/api/auth";
import { ui } from "@/lib/ui";
import { getErrorMessage } from "@/lib/api-error";
import { AdminUsers } from "@/pages/AdminUsers";
import { AdminSettings as AdminSiteSettings } from "@/pages/AdminSettings";
import { AdminStyleGuide } from "@/pages/AdminStyleGuide";
import { AdminOverview } from "@/pages/AdminDashboard";
import { DriveIntegrationCard } from "@/components/DriveIntegrationCard";
import { ApiKeysSettings } from "@/components/ApiKeysSettings";
import { ConnectedAccounts } from "@/components/settings/ConnectedAccounts";
import { DangerZone } from "@/components/settings/DangerZone";
import { userTabs, adminTabs, type Tab, type TabItem } from "@/components/settings/tabs";

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
      const msg = getErrorMessage(err, "Update failed");
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
      const msg = getErrorMessage(err, "Password change failed");
      setPasswordStatus({ type: "error", message: msg === "Unauthorized" ? "Current password is incorrect" : msg });
    } finally {
      setPasswordPending(false);
    }
  }

  const isAdmin = user?.role === "admin";

  function NavItem({ tab }: { readonly tab: TabItem }) {
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

              <ConnectedAccounts />

              <DangerZone />
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

          {activeTab === "api-keys" && <ApiKeysSettings />}

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
