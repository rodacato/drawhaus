import { useState } from "react";
import { setupApi } from "@/api/setup";
import { ui } from "@/lib/ui";

export function SetupStep3({ onComplete }: { onComplete: () => void }) {
  const [pending, setPending] = useState(false);

  async function handleSkip() {
    setPending(true);
    try {
      await setupApi.skipIntegrations();
      onComplete();
    } catch {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className={ui.h2}>Integrations</h2>
        <p className="text-sm text-text-secondary">
          Configure optional integrations like Google OAuth, email, and error monitoring.
          You can set these up later from the admin settings.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text-primary">Google OAuth</p>
          <p className="text-xs text-text-muted">Enable Google login and Drive integration</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text-primary">Email (Resend)</p>
          <p className="text-xs text-text-muted">Send invitations and password reset emails</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text-primary">Error Monitoring</p>
          <p className="text-xs text-text-muted">Honeybadger error tracking</p>
        </div>
      </div>

      <p className="text-xs text-text-muted">
        These integrations will be configurable from the admin panel once integration secrets are stored in the database (coming soon).
      </p>

      <button className={`${ui.btn} ${ui.btnPrimary} w-full`} onClick={handleSkip} disabled={pending}>
        {pending ? "Finishing..." : "Skip for now & finish setup"}
      </button>
    </div>
  );
}
