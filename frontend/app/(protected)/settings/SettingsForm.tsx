"use client";

import { useState } from "react";
import type { AuthUser } from "@/lib/auth";
import { ui } from "@/lib/ui";

export default function SettingsForm({ user }: { user: AuthUser }) {
  // Profile state
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [profilePending, setProfilePending] = useState(false);

  // Password state
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
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setProfileStatus({ type: "error", message: (data as { error?: string }).error ?? "Update failed" });
      } else {
        setProfileStatus({ type: "success", message: "Profile updated" });
      }
    } catch {
      setProfileStatus({ type: "error", message: "Network error" });
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
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as { error?: string }).error ?? "Password change failed";
        setPasswordStatus({ type: "error", message: msg === "Unauthorized" ? "Current password is incorrect" : msg });
      } else {
        setPasswordStatus({ type: "success", message: "Password changed" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordStatus({ type: "error", message: "Network error" });
    } finally {
      setPasswordPending(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile section */}
      <div className={ui.card}>
        <h2 className={ui.h2}>Profile</h2>
        <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
          <label className={ui.label}>
            Name
            <input
              className={ui.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </label>
          <label className={ui.label}>
            Email
            <input
              className={ui.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          {profileStatus && (
            <p className={profileStatus.type === "error" ? ui.alertError : "text-sm text-green-600"}>
              {profileStatus.message}
            </p>
          )}
          <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={profilePending}>
            {profilePending ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {/* Password section */}
      <div className={ui.card}>
        <h2 className={ui.h2}>Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
          <label className={ui.label}>
            Current password
            <input
              className={ui.input}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className={ui.label}>
            New password
            <input
              className={ui.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label className={ui.label}>
            Confirm new password
            <input
              className={ui.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          {passwordStatus && (
            <p className={passwordStatus.type === "error" ? ui.alertError : "text-sm text-green-600"}>
              {passwordStatus.message}
            </p>
          )}
          <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={passwordPending}>
            {passwordPending ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
