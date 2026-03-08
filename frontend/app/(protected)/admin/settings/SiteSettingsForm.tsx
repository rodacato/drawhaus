"use client";

import { useState } from "react";
import { ui } from "@/lib/ui";

type SiteSettings = {
  registrationOpen: boolean;
  instanceName: string;
};

export default function SiteSettingsForm({
  initialSettings,
}: {
  initialSettings: SiteSettings;
}) {
  const [instanceName, setInstanceName] = useState(initialSettings.instanceName);
  const [registrationOpen, setRegistrationOpen] = useState(initialSettings.registrationOpen);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName: instanceName.trim(), registrationOpen }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus({ type: "error", message: body.error ?? "Update failed" });
      } else {
        setStatus({ type: "success", message: "Settings saved" });
      }
    } catch {
      setStatus({ type: "error", message: "Network error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={ui.card}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className={ui.label}>
          Instance Name
          <input
            className={ui.input}
            type="text"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
            required
            maxLength={100}
          />
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-text-secondary">
          <input
            type="checkbox"
            checked={registrationOpen}
            onChange={(e) => setRegistrationOpen(e.target.checked)}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent/25"
          />
          Allow new user registration
        </label>

        {status && (
          <p className={status.type === "error" ? ui.alertError : "text-sm text-green-600"}>
            {status.message}
          </p>
        )}

        <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={pending}>
          {pending ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
