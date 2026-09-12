import { useEffect, useState } from "react";
import type { AdminWebhook, AdminWebhookDelivery } from "@/api/admin";
import { adminApi } from "@/api/admin";
import { ui } from "@/lib/ui";
import { getErrorMessage } from "@/lib/api-error";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { ToggleSwitch } from "@/components/ToggleSwitch";

const STATUS_BADGE_CLASSES: Record<AdminWebhookDelivery["status"], string> = {
  pending: "bg-surface-raised text-text-muted",
  delivered: "bg-success/10 text-success",
  failed: "bg-error/10 text-error",
};

export function WebhooksPanel() {
  const [webhooks, setWebhooks] = useState<AdminWebhook[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openDeliveries, setOpenDeliveries] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<AdminWebhookDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    adminApi
      .listWebhooks()
      .then((data) => {
        setWebhooks(data.webhooks);
        setAvailableEvents(data.events);
        setEncryptionEnabled(data.encryptionEnabled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function reload() {
    const data = await adminApi.listWebhooks();
    setWebhooks(data.webhooks);
  }

  function toggleEvent(event: string) {
    setSelectedEvents((current) =>
      current.includes(event) ? current.filter((e) => e !== event) : [...current, event],
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const data = await adminApi.createWebhook({
        url: url.trim(),
        description: description.trim(),
        events: selectedEvents,
      });
      setRevealedSecret(data.secret);
      setCopied(false);
      setUrl("");
      setDescription("");
      setSelectedEvents([]);
      await reload();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create webhook"));
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(webhook: AdminWebhook) {
    setBusyId(webhook.id);
    try {
      await adminApi.updateWebhook(webhook.id, { active: !webhook.active });
      await reload();
    } catch {
      toast("Failed to update webhook", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(webhook: AdminWebhook) {
    const ok = await confirm({
      title: "Delete webhook",
      message: `Delete the webhook for ${webhook.url}? Its delivery log goes with it.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(webhook.id);
    try {
      await adminApi.deleteWebhook(webhook.id);
      if (openDeliveries === webhook.id) setOpenDeliveries(null);
      await reload();
      toast("Webhook deleted", "success");
    } catch {
      toast("Failed to delete webhook", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRegenerate(webhook: AdminWebhook) {
    const ok = await confirm({
      title: "Regenerate signing secret",
      message: "The current secret stops working immediately. Receivers must be updated.",
      confirmLabel: "Regenerate",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(webhook.id);
    try {
      const data = await adminApi.regenerateWebhookSecret(webhook.id);
      setRevealedSecret(data.secret);
      setCopied(false);
    } catch {
      toast("Failed to regenerate secret", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleTest(webhook: AdminWebhook) {
    setBusyId(webhook.id);
    try {
      const { result } = await adminApi.testWebhook(webhook.id);
      if (result.ok) toast(`Test event delivered (HTTP ${result.status})`, "success");
      else toast(`Test event failed: ${result.error}`, "error");
    } catch {
      toast("Failed to send test event", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleDeliveries(webhook: AdminWebhook) {
    if (openDeliveries === webhook.id) {
      setOpenDeliveries(null);
      return;
    }
    setOpenDeliveries(webhook.id);
    setDeliveries([]);
    setDeliveriesLoading(true);
    try {
      const data = await adminApi.listWebhookDeliveries(webhook.id);
      setDeliveries(data.deliveries);
    } catch {
      toast("Failed to load deliveries", "error");
    } finally {
      setDeliveriesLoading(false);
    }
  }

  function handleCopy() {
    if (!revealedSecret) return;
    navigator.clipboard?.writeText(revealedSecret);
    setCopied(true);
  }

  if (loading) return <p className={ui.muted}>Loading webhooks...</p>;

  if (!encryptionEnabled) {
    return (
      <div className={ui.alertError}>
        <strong>ENCRYPTION_KEY</strong> is not set, so a webhook signing secret cannot be stored and
        webhooks are unavailable. Set <code className="font-mono text-xs">ENCRYPTION_KEY</code> (64
        hex chars) to enable them.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {revealedSecret && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
          <p className="text-sm font-medium text-text-primary">
            Copy the signing secret now — it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-surface px-3 py-2 text-sm font-mono text-text-primary break-all border border-border">
              {revealedSecret}
            </code>
            <button className={`${ui.btn} ${ui.btnSecondary}`} onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              className={`${ui.btn} ${ui.btnSecondary}`}
              onClick={() => setRevealedSecret(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && <div className={ui.alertError}>{error}</div>}

      <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-text-primary">Add Webhook</h3>
        <label className={ui.label}>
          <span>Endpoint URL</span>
          <input
            className={ui.input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/hooks/drawhaus"
            required
            maxLength={2048}
          />
        </label>
        <label className={ui.label}>
          <span>Description (optional)</span>
          <input
            className={ui.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Rebuild docs in CI"
            maxLength={200}
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-text-secondary">Events</legend>
          <div className="flex flex-wrap gap-3">
            {availableEvents.map((event) => (
              <label key={event} className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event)}
                  onChange={() => toggleEvent(event)}
                />
                <span className="font-mono text-xs">{event}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          className={`${ui.btn} ${ui.btnPrimary}`}
          disabled={creating || !url.trim() || selectedEvents.length === 0}
        >
          {creating ? "Adding..." : "Add Webhook"}
        </button>
      </form>

      {webhooks.length === 0 ? (
        <p className={ui.empty}>No webhooks registered.</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{webhook.url}</p>
                  {webhook.description && <p className={ui.muted}>{webhook.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {webhook.events.map((event) => (
                      <span key={event} className={`${ui.badge} font-mono`}>
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={ui.muted}>{webhook.active ? "Active" : "Paused"}</span>
                  <ToggleSwitch
                    checked={webhook.active}
                    onChange={() => handleToggleActive(webhook)}
                    disabled={busyId === webhook.id}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <button
                  className={`${ui.btn} ${ui.btnSecondary} text-xs h-8! px-2.5!`}
                  onClick={() => handleToggleDeliveries(webhook)}
                >
                  {openDeliveries === webhook.id ? "Hide deliveries" : "Deliveries"}
                </button>
                <button
                  className={`${ui.btn} ${ui.btnSecondary} text-xs h-8! px-2.5!`}
                  onClick={() => handleTest(webhook)}
                  disabled={busyId === webhook.id}
                >
                  Send test event
                </button>
                <button
                  className={`${ui.btn} ${ui.btnSecondary} text-xs h-8! px-2.5!`}
                  onClick={() => handleRegenerate(webhook)}
                  disabled={busyId === webhook.id}
                >
                  Regenerate secret
                </button>
                <button
                  className={`${ui.btn} ${ui.btnDanger} text-xs h-8! px-2.5!`}
                  onClick={() => handleDelete(webhook)}
                  disabled={busyId === webhook.id}
                >
                  Delete
                </button>
              </div>

              {openDeliveries === webhook.id && (
                <div className="mt-3 border-t border-border pt-3">
                  {deliveriesLoading && <p className={ui.muted}>Loading deliveries...</p>}
                  {!deliveriesLoading && deliveries.length === 0 && (
                    <p className={ui.muted}>No deliveries yet.</p>
                  )}
                  {!deliveriesLoading &&
                    deliveries.map((delivery) => (
                      <div key={delivery.id} className="border-b border-border py-2 last:border-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${STATUS_BADGE_CLASSES[delivery.status]}`}
                          >
                            {delivery.status}
                          </span>
                          <span className="font-mono text-xs text-text-primary">
                            {delivery.eventType}
                          </span>
                          <span className={`${ui.muted} text-xs`}>
                            {delivery.attempts} attempt{delivery.attempts === 1 ? "" : "s"}
                          </span>
                          <span className={`${ui.muted} text-xs`}>
                            {new Date(delivery.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {delivery.lastError && (
                          <p className="mt-1 font-mono text-xs text-error break-all">
                            {delivery.lastError}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
