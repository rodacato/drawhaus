import { FormEvent, useState } from "react";
import { setupApi } from "@/api/setup";
import { ui } from "@/lib/ui";

export function SetupStep2({ onComplete }: { onComplete: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const instanceName = String(formData.get("instanceName") ?? "");
    const registrationOpen = formData.get("registrationOpen") === "on";
    const backupEnabled = formData.get("backupEnabled") === "on";
    const backupCron = String(formData.get("backupCron") ?? "0 3 * * *");
    const backupRetentionDays = Number(formData.get("backupRetentionDays")) || 7;

    try {
      await setupApi.submitStep2({ instanceName, registrationOpen, backupEnabled, backupCron, backupRetentionDays });
      onComplete();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Update failed";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className={ui.h2}>Instance Configuration</h2>
        <p className="text-sm text-text-secondary">Name your instance and choose who can sign up.</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className={ui.label}>
          <span>Instance Name</span>
          <input className={ui.input} type="text" name="instanceName" defaultValue="Drawhaus" required maxLength={100} />
        </label>
        <label className="flex items-center gap-3 text-sm text-text-secondary">
          <input type="checkbox" name="registrationOpen" defaultChecked className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
          <span>Allow public registration</span>
        </label>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium text-text-primary mb-3">Database Backups</p>
          <label className="flex items-center gap-3 text-sm text-text-secondary">
            <input type="checkbox" name="backupEnabled" defaultChecked className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <span>Enable automated backups</span>
          </label>
          <div className="mt-3 space-y-3">
            <label className={ui.label}>
              <span>Cron Schedule</span>
              <input className={ui.input} type="text" name="backupCron" defaultValue="0 3 * * *" placeholder="0 3 * * *" />
              <span className="text-xs text-text-muted">Daily at 3AM UTC. Use crontab syntax.</span>
            </label>
            <label className={ui.label}>
              <span>Retention (days)</span>
              <input className={ui.input} type="number" name="backupRetentionDays" defaultValue={7} min={1} max={365} />
              <span className="text-xs text-text-muted">Backups older than this are deleted automatically.</span>
            </label>
          </div>
        </div>

        {error && <p className={ui.alertError}>{error}</p>}
        <button className={`${ui.btn} ${ui.btnPrimary} w-full`} type="submit" disabled={pending}>
          {pending ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
