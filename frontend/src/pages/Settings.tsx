import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/api/auth";
import { ui } from "@/lib/ui";

export function Settings() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [profilePending, setProfilePending] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Settings</h1>
        <p className={ui.subtitle}>Manage your profile and security.</p>
      </div>
      <div className="space-y-8">
        <div className={ui.card}>
          <h2 className={ui.h2}>Profile</h2>
          <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
            <label className={ui.label}>Name<input className={ui.input} type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></label>
            <label className={ui.label}>Email<input className={ui.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            {profileStatus && <p className={profileStatus.type === "error" ? ui.alertError : "text-sm text-green-600"}>{profileStatus.message}</p>}
            <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={profilePending}>{profilePending ? "Saving..." : "Save Profile"}</button>
          </form>
        </div>
        <div className={ui.card}>
          <h2 className={ui.h2}>Change Password</h2>
          <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
            <label className={ui.label}>Current password<input className={ui.input} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label>
            <label className={ui.label}>New password<input className={ui.input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} /></label>
            <label className={ui.label}>Confirm new password<input className={ui.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} /></label>
            {passwordStatus && <p className={passwordStatus.type === "error" ? ui.alertError : "text-sm text-green-600"}>{passwordStatus.message}</p>}
            <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={passwordPending}>{passwordPending ? "Changing..." : "Change Password"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
