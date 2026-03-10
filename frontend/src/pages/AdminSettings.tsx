import { useEffect, useState } from "react";
import { adminApi } from "@/api/admin";
import { ui } from "@/lib/ui";

export function AdminSettings() {
  const [instanceName, setInstanceName] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    adminApi.getSettings().then((data) => {
      const s = data.settings ?? data;
      setInstanceName(s.instanceName ?? "");
      setRegistrationOpen(s.registrationOpen ?? false);
      setLoaded(true);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      await adminApi.updateSettings({ instanceName: instanceName.trim(), registrationOpen });
      setStatus({ type: "success", message: "Settings saved" });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Update failed";
      setStatus({ type: "error", message: msg });
    } finally {
      setPending(false);
    }
  }

  if (!loaded) return <div className="text-sm text-text-muted">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Site Settings</h1>
        <p className={ui.subtitle}>Configure your Drawhaus instance.</p>
      </div>
      <div className={ui.card}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className={ui.label}>Instance Name<input className={ui.input} type="text" value={instanceName} onChange={(e) => setInstanceName(e.target.value)} required maxLength={100} /></label>
          <label className="flex items-center gap-3 text-sm font-medium text-text-secondary">
            <input type="checkbox" checked={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/25" />
            Allow new user registration
          </label>
          {status && <p className={status.type === "error" ? ui.alertError : "text-sm text-green-600"}>{status.message}</p>}
          <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={pending}>{pending ? "Saving..." : "Save Settings"}</button>
        </form>
      </div>
    </div>
  );
}
