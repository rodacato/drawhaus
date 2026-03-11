import { useEffect, useState } from "react";
import { adminApi } from "@/api/admin";
import { ui } from "@/lib/ui";
import { ToggleSwitch } from "@/components/ToggleSwitch";

export function AdminSettings() {
  const [instanceName, setInstanceName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maxWorkspacesPerUser, setMaxWorkspacesPerUser] = useState(5);
  const [maxMembersPerWorkspace, setMaxMembersPerWorkspace] = useState(5);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    adminApi.getSettings().then((data) => {
      const s = data.settings ?? data;
      setInstanceName(s.instanceName ?? "");
      setAdminEmail(s.adminEmail ?? "");
      setRegistrationOpen(s.registrationOpen ?? false);
      setMaintenanceMode(s.maintenanceMode ?? false);
      setMaxWorkspacesPerUser(s.maxWorkspacesPerUser ?? 5);
      setMaxMembersPerWorkspace(s.maxMembersPerWorkspace ?? 5);
      setLoaded(true);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      await adminApi.updateSettings({ instanceName: instanceName.trim(), registrationOpen, maxWorkspacesPerUser, maxMembersPerWorkspace });
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={ui.card}>
          <h2 className={ui.h2}>General</h2>
          <div className="mt-4 space-y-4">
            <label className={ui.label}>Instance Name<input className={ui.input} type="text" value={instanceName} onChange={(e) => setInstanceName(e.target.value)} required maxLength={100} /></label>
            <label className={ui.label}>Admin Contact Email<input className={ui.input} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" /></label>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className={ui.h2}>Access & Security</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Allow Registration</p>
                <p className={ui.muted}>New users can create accounts on this instance.</p>
              </div>
              <ToggleSwitch checked={registrationOpen} onChange={setRegistrationOpen} />
            </div>
            <div className="border-t border-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Maintenance Mode</p>
                <p className={ui.muted}>Only admins can access the instance while enabled.</p>
              </div>
              <ToggleSwitch checked={maintenanceMode} onChange={setMaintenanceMode} />
            </div>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className={ui.h2}>Workspace Limits</h2>
          <div className="mt-4 space-y-4">
            <label className={ui.label}>Max Workspaces per User<input className={ui.input} type="number" min={1} max={50} value={maxWorkspacesPerUser} onChange={(e) => setMaxWorkspacesPerUser(Number(e.target.value))} /></label>
            <label className={ui.label}>Max Members per Workspace<input className={ui.input} type="number" min={1} max={100} value={maxMembersPerWorkspace} onChange={(e) => setMaxMembersPerWorkspace(Number(e.target.value))} /></label>
          </div>
        </div>

        {status && <p className={status.type === "error" ? ui.alertError : ui.alertSuccess}>{status.message}</p>}
        <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={pending}>{pending ? "Saving..." : "Save Changes"}</button>
      </form>
    </div>
  );
}
