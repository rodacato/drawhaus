import { useCallback, useEffect, useState } from "react";
import { workspacesApi, type Workspace, type WorkspaceMember } from "@/api/workspaces";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b"];

interface WorkspaceSettingsContentProps {
  workspaceId: string;
  onClose: () => void;
  onWorkspaceUpdated?: () => void;
  onStatusMessage?: (msg: string) => void;
}

export function WorkspaceSettingsContent({ workspaceId, onClose, onWorkspaceUpdated, onStatusMessage }: WorkspaceSettingsContentProps) {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Edit state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer" | "admin">("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  // Transfer ownership state
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [transferResources, setTransferResources] = useState(true);
  const [transferring, setTransferring] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await workspacesApi.get(workspaceId);
      setWorkspace(data.workspace);
      setMembers(data.members);
      setRole(data.role);
      setName(data.workspace.name);
      setDescription(data.workspace.description);
      setColor(data.workspace.color);
      setIcon(data.workspace.icon);
    } catch {
      onClose();
    }
    setLoading(false);
  }, [workspaceId, onClose]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await workspacesApi.update(workspaceId, { name: name.trim(), description: description.trim(), color, icon });
      setWorkspace(res.workspace);
      onWorkspaceUpdated?.();
      onStatusMessage?.("Workspace updated");
      onClose();
    } catch { /* silent */ }
    setSaving(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteStatus(null);
    try {
      await workspacesApi.invite(workspaceId, inviteEmail.trim(), inviteRole);
      setInviteStatus(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      loadData();
    } catch {
      setInviteStatus("Failed to send invitation");
    }
    setInviting(false);
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await workspacesApi.updateMemberRole(workspaceId, userId, newRole);
      loadData();
    } catch { /* silent */ }
  }

  async function handleRemoveMember(userId: string) {
    const member = members.find((m) => m.userId === userId);
    const isSelf = userId === user?.id;
    const ok = await confirm({
      title: isSelf ? "Leave Workspace" : "Remove Member",
      message: isSelf
        ? "You will lose access to this workspace. You can be re-invited later."
        : `Remove ${member?.userName ?? "this member"} from the workspace?`,
      confirmLabel: isSelf ? "Leave" : "Remove",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await workspacesApi.removeMember(workspaceId, userId);
      toast(isSelf ? "You left the workspace" : "Member removed");
      loadData();
    } catch { toast("Failed to remove member.", "error"); }
  }

  async function handleTransferOwnership() {
    if (!transferTarget || !workspace) return;
    const targetMember = members.find((m) => m.userId === transferTarget);
    const ok = await confirm({
      title: "Transfer Ownership",
      message: `Transfer ownership of "${workspace.name}" to ${targetMember?.userName ?? "this member"}?${transferResources ? " Your diagrams and templates in this workspace will also be transferred." : ""} This action cannot be undone.`,
      confirmLabel: "Transfer",
      variant: "danger",
    });
    if (!ok) return;
    setTransferring(true);
    try {
      const result = await workspacesApi.transferOwnership(workspaceId, transferTarget, transferResources);
      const parts = ["Ownership transferred"];
      if (result.diagramCount > 0) parts.push(`${result.diagramCount} diagram${result.diagramCount !== 1 ? "s" : ""}`);
      if (result.templateCount > 0) parts.push(`${result.templateCount} template${result.templateCount !== 1 ? "s" : ""}`);
      toast(parts.join(", "));
      setShowTransfer(false);
      onWorkspaceUpdated?.();
      loadData();
    } catch { toast("Failed to transfer ownership.", "error"); }
    setTransferring(false);
  }

  async function handleDelete() {
    if (!workspace) return;
    const ok = await confirm({
      title: "Delete Workspace",
      message: `"${workspace.name}" will be permanently deleted. All diagrams will revert to their owners' personal workspaces.`,
      confirmLabel: "Delete Workspace",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await workspacesApi.delete(workspaceId);
      toast("Workspace deleted");
      onWorkspaceUpdated?.();
      onClose();
    } catch { toast("Failed to delete workspace.", "error"); }
  }

  if (loading) {
    return <div className="flex h-48 items-center justify-center text-sm text-text-muted">Loading...</div>;
  }
  if (!workspace) return null;

  const isAdmin = role === "admin";

  return (
    <div className="space-y-6 p-6">
      {/* Identity */}
      <section className="rounded-xl border border-border bg-surface-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Workspace Identity</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Name</label>
            <input
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Description</label>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isAdmin}
              placeholder="What is this workspace for?"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">Icon (emoji)</label>
            <input
              className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-center text-lg outline-none focus:ring-2 focus:ring-primary/20"
              value={icon}
              onChange={(e) => setIcon(e.target.value.slice(0, 4))}
              disabled={!isAdmin}
              placeholder="📁"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => isAdmin && setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition ${color === c ? "border-text-primary scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  disabled={!isAdmin}
                  type="button"
                />
              ))}
            </div>
          </div>
          {isAdmin && (
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover" type="button">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </section>

      {/* Members */}
      <section className="rounded-xl border border-border bg-surface-raised p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Members</h2>
          <span className="text-sm text-text-muted">{members.length} member{members.length !== 1 ? "s" : ""}</span>
        </div>

        {isAdmin && (
          <form onSubmit={handleInvite} className="mb-6 flex gap-2">
            <input
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer" | "admin")}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={inviting} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover">
              {inviting ? "Sending..." : "Invite"}
            </button>
          </form>
        )}

        {inviteStatus && <p className="mb-4 text-sm text-text-muted">{inviteStatus}</p>}

        <div className="divide-y divide-border">
          {members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                  {member.userName?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{member.userName}</p>
                  <p className="text-xs text-text-muted">{member.userEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && member.userId !== workspace.ownerId ? (
                  <select
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none"
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-text-muted capitalize">{member.role}</span>
                )}
                {member.userId === workspace.ownerId && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Owner</span>
                )}
                {isAdmin && member.userId !== workspace.ownerId && member.userId !== user?.id && (
                  <button onClick={() => handleRemoveMember(member.userId)} className="rounded p-1 text-text-muted hover:text-error transition" title="Remove member" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  </button>
                )}
                {member.userId === user?.id && member.userId !== workspace.ownerId && (
                  <button onClick={() => handleRemoveMember(member.userId)} className="rounded px-2 py-0.5 text-xs text-error hover:bg-error/10 transition" type="button">
                    Leave
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transfer Ownership (owner only) */}
      {user?.id === workspace.ownerId && !workspace.isPersonal && (
        <section className="rounded-xl border border-border bg-surface-raised p-6">
          <h2 className="mb-2 text-lg font-semibold text-text-primary">Transfer Ownership</h2>
          <p className="mb-4 text-sm text-text-secondary">
            Transfer this workspace to another admin. You will remain as an admin after the transfer.
          </p>
          {!showTransfer ? (
            <button onClick={() => setShowTransfer(true)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-surface" type="button">
              Transfer Ownership...
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">New Owner</label>
                <select
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none"
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                >
                  <option value="">Select an admin...</option>
                  {members
                    .filter((m) => m.role === "admin" && m.userId !== user?.id)
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>{m.userName} ({m.userEmail})</option>
                    ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={transferResources}
                  onChange={(e) => setTransferResources(e.target.checked)}
                  className="rounded border-border"
                />
                Also transfer my diagrams and templates in this workspace
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleTransferOwnership}
                  disabled={!transferTarget || transferring}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
                  type="button"
                >
                  {transferring ? "Transferring..." : "Confirm Transfer"}
                </button>
                <button onClick={() => setShowTransfer(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition hover:bg-surface" type="button">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Danger Zone */}
      {isAdmin && !workspace.isPersonal && (
        <section className="rounded-xl border border-error/30 bg-error/5 p-6">
          <h2 className="mb-2 text-lg font-semibold text-error">Danger Zone</h2>
          <p className="mb-4 text-sm text-text-secondary">Once you delete a workspace, all diagrams will revert to their owners' personal workspaces.</p>
          <button onClick={handleDelete} className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition hover:bg-error/80" type="button">
            Delete Workspace
          </button>
        </section>
      )}
    </div>
  );
}
