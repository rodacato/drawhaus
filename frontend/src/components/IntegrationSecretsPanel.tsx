import { useEffect, useState } from "react";
import { adminApi } from "@/api/admin";
import { ui } from "@/lib/ui";
import { useToast } from "@/components/Toast";

type Integration = {
  key: string;
  source: "db" | "env" | "none";
  maskedValue: string;
};

const LABELS: Record<string, { label: string; group: string }> = {
  GOOGLE_CLIENT_ID: { label: "Client ID", group: "Google OAuth" },
  GOOGLE_CLIENT_SECRET: { label: "Client Secret", group: "Google OAuth" },
  GOOGLE_REDIRECT_URI: { label: "Redirect URI", group: "Google OAuth" },
  RESEND_API_KEY: { label: "API Key", group: "Email (Resend)" },
  FROM_EMAIL: { label: "From Address", group: "Email (Resend)" },
  HONEYBADGER_API_KEY: { label: "API Key", group: "Error Monitoring" },
};

export function IntegrationSecretsPanel() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    adminApi.getIntegrations()
      .then((data) => {
        setIntegrations(data.integrations);
        setEncryptionEnabled(data.encryptionEnabled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(key: string) {
    setSaving(true);
    try {
      await adminApi.updateIntegration(key, editValue);
      // Refresh
      const data = await adminApi.getIntegrations();
      setIntegrations(data.integrations);
      setEditing(null);
      setEditValue("");
      toast("Integration secret updated", "success");
    } catch {
      toast("Failed to update secret", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear(key: string) {
    setSaving(true);
    try {
      await adminApi.updateIntegration(key, "");
      const data = await adminApi.getIntegrations();
      setIntegrations(data.integrations);
      toast("Secret cleared", "success");
    } catch {
      toast("Failed to clear secret", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-text-muted">Loading integrations...</p>;

  if (!encryptionEnabled) {
    return (
      <div className={ui.alertError}>
        <strong>ENCRYPTION_KEY</strong> is not set. Integration secrets can only be configured via environment variables.
        Set <code className="font-mono text-xs">ENCRYPTION_KEY</code> (64 hex chars) to enable admin UI configuration.
      </div>
    );
  }

  // Group integrations
  const groups = new Map<string, Integration[]>();
  for (const item of integrations) {
    const group = LABELS[item.key]?.group ?? "Other";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(item);
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([group, items]) => (
        <div key={group} className="space-y-3">
          <h3 className="text-sm font-medium text-text-primary">{group}</h3>
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {LABELS[item.key]?.label ?? item.key}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    item.source === "db" ? "bg-primary/10 text-primary" :
                    item.source === "env" ? "bg-success/10 text-success" :
                    "bg-surface-raised text-text-muted"
                  }`}>
                    {item.source === "db" ? "DB" : item.source === "env" ? "ENV" : "Not set"}
                  </span>
                </div>
                {editing === item.key ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      className={`${ui.input} flex-1`}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder={`Enter ${LABELS[item.key]?.label ?? item.key}`}
                      autoFocus
                    />
                    <button
                      className={`${ui.btn} ${ui.btnPrimary}`}
                      onClick={() => handleSave(item.key)}
                      disabled={saving || !editValue}
                    >
                      Save
                    </button>
                    <button
                      className={`${ui.btn} ${ui.btnSecondary}`}
                      onClick={() => { setEditing(null); setEditValue(""); }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted font-mono mt-0.5">
                    {item.maskedValue || "—"}
                  </p>
                )}
              </div>
              {editing !== item.key && (
                <div className="flex gap-1">
                  <button
                    className={`${ui.btn} ${ui.btnSecondary} text-xs h-8! px-2.5!`}
                    onClick={() => { setEditing(item.key); setEditValue(""); }}
                  >
                    Edit
                  </button>
                  {item.source === "db" && (
                    <button
                      className={`${ui.btn} ${ui.btnDanger} text-xs h-8! px-2.5!`}
                      onClick={() => handleClear(item.key)}
                      disabled={saving}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
