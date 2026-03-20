import { useState, useEffect, useCallback } from "react";
import { apiKeysApi, type ApiKeyResponse } from "@/api/api-keys";
import { workspacesApi, type Workspace } from "@/api/workspaces";
import { ui } from "@/lib/ui";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function keyStatus(key: ApiKeyResponse): { label: string; className: string } {
  if (key.revokedAt) return { label: "Revoked", className: "text-text-muted" };
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return { label: "Expired", className: "text-warning" };
  return { label: "Active", className: "text-success" };
}

export function ApiKeysSettings() {
  const [keys, setKeys] = useState<ApiKeyResponse[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createWorkspaceId, setCreateWorkspaceId] = useState("");
  const [createExpires, setCreateExpires] = useState("");
  const [creating, setCreating] = useState(false);

  // Post-create: show the plain key
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const res = await apiKeysApi.list();
      setKeys(res.keys);
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
    workspacesApi.list().then((res) => {
      setWorkspaces(res.workspaces);
      if (res.workspaces.length > 0) setCreateWorkspaceId(res.workspaces[0].id);
    }).catch(() => {});
  }, [loadKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await apiKeysApi.create({
        name: createName.trim(),
        workspaceId: createWorkspaceId,
        ...(createExpires ? { expiresAt: new Date(createExpires).toISOString() } : {}),
      });
      setCreatedKey(res.plainKey);
      setCreateName("");
      setCreateExpires("");
      setShowCreate(false);
      await loadKeys();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to create key";
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await apiKeysApi.revoke(id);
      await loadKeys();
    } catch {
      setError("Failed to revoke key");
    }
  }

  function handleCopy() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const workspaceName = (id: string) => workspaces.find((w) => w.id === id)?.name ?? "Unknown";

  if (loading) return <p className={ui.muted}>Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={ui.h2}>API Keys</h2>
          <p className={`${ui.muted} mt-1`}>Manage keys for programmatic access to the /v1/ API.</p>
        </div>
        <button
          className={`${ui.btn} ${ui.btnPrimary}`}
          onClick={() => { setShowCreate(true); setCreatedKey(null); }}
        >
          Create key
        </button>
      </div>

      {error && <div className={ui.alertError}>{error}</div>}

      {/* Post-create: show the plain key once */}
      {createdKey && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
          <p className="text-sm font-medium text-text-primary">Your API key was created. Copy it now — it won't be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-surface px-3 py-2 text-sm font-mono text-text-primary break-all border border-border">
              {createdKey}
            </code>
            <button className={`${ui.btn} ${ui.btnSecondary}`} onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className={ui.card}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">New API Key</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <label className={ui.label}>
              Name
              <input
                className={ui.input}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. MCP Server, CI/CD"
                required
                maxLength={100}
              />
            </label>
            <label className={ui.label}>
              Workspace
              <select
                className={ui.input}
                value={createWorkspaceId}
                onChange={(e) => setCreateWorkspaceId(e.target.value)}
                required
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
            <label className={ui.label}>
              Expiration (optional)
              <input
                type="date"
                className={ui.input}
                value={createExpires}
                onChange={(e) => setCreateExpires(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" className={`${ui.btn} ${ui.btnSecondary}`} onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={creating || !createName.trim()}>
                {creating ? "Creating..." : "Create key"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 && !showCreate ? (
        <div className={ui.empty}>
          <p className="font-medium">No API keys yet</p>
          <p className="mt-1">Create an API key to access diagrams programmatically via the /v1/ API.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Workspace</th>
                <th className="pb-2 font-medium">Key</th>
                <th className="pb-2 font-medium">Last used</th>
                <th className="pb-2 font-medium">Expires</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const status = keyStatus(k);
                const isActive = !k.revokedAt && (!k.expiresAt || new Date(k.expiresAt) >= new Date());
                return (
                  <tr key={k.id} className="border-b border-border/50">
                    <td className="py-3 text-text-primary">{k.name}</td>
                    <td className="py-3 text-text-secondary">{workspaceName(k.workspaceId)}</td>
                    <td className="py-3 font-mono text-text-muted">{k.keyPrefix}...</td>
                    <td className="py-3 text-text-secondary">{formatDate(k.lastUsedAt)}</td>
                    <td className="py-3 text-text-secondary">{k.expiresAt ? formatDate(k.expiresAt) : "Never"}</td>
                    <td className={`py-3 font-medium ${status.className}`}>{status.label}</td>
                    <td className="py-3 text-right">
                      {isActive && (
                        <button
                          className={`${ui.btn} ${ui.btnDanger} !h-8 !px-3 !text-xs`}
                          onClick={() => handleRevoke(k.id)}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
