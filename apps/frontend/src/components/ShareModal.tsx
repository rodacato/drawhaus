import { useState, useEffect, useCallback } from "react";
import { Dialog } from "@/components/Dialog";
import { ui } from "@/lib/ui";
import { shareApi } from "@/api/share";
import { useToast } from "@/components/Toast";
import {
  IconShare,
  IconX,
  IconCopy,
  IconCheck,
  IconEdit,
  IconEye,
  IconCalendar,
  IconTrash,
  IconLink,
} from "@/components/Icons";
import { isExpired, formatRelativeDate } from "@/lib/format-utils";

const MAX_EXPIRY_DAYS = 30;

function parseExpiryDays(value: string): number | undefined | "invalid" {
  if (!value.trim()) return undefined;
  const days = Number(value);
  return Number.isInteger(days) && days >= 1 && days <= MAX_EXPIRY_DAYS ? days : "invalid";
}

type ShareLink = {
  token: string;
  diagramId: string;
  role: string;
  expiresAt: string | null;
  createdAt: string;
};

export function computeLinkBadge(link: ShareLink): { badgeText: string; badgeClass: string } {
  if (isExpired(link.expiresAt)) {
    return { badgeText: "Expired", badgeClass: "bg-error/10 text-error ring-error/20" };
  }
  if (link.expiresAt) {
    const d = new Date(link.expiresAt);
    const badgeText = `Expires ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    return { badgeText, badgeClass: "bg-warning/10 text-warning ring-warning/20" };
  }
  return { badgeText: "Active", badgeClass: "bg-success/10 text-success ring-success/20" };
}

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  diagramId: string;
}

/* ── Component ───────────────────────────────────────────── */

export function ShareModal({ open, onClose, diagramId }: ShareModalProps) {
  const [selectedRole, setSelectedRole] = useState("viewer");
  const [expiresIn, setExpiresIn] = useState("");
  const toast = useToast();
  const expiryDays = parseExpiryDays(expiresIn);
  const [copied, setCopied] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    if (!diagramId) return;
    setLoadingLinks(true);
    try {
      const data = await shareApi.list(diagramId);
      setLinks(data.links ?? []);
    } catch {
      toast("Could not load the share links", "error");
    } finally {
      setLoadingLinks(false);
    }
  }, [diagramId, toast]);

  // Load links when modal opens
  useEffect(() => {
    if (open) {
      loadLinks();
      setCreatedToken(null);
      setCopied(false);
    }
  }, [open, loadLinks]);

  const linkUrl = createdToken
    ? `${globalThis.location.origin}/share/${createdToken}`
    : `${globalThis.location.origin}/share/...`;

  const handleCreateAndCopy = useCallback(async () => {
    if (creating || expiryDays === "invalid") return;
    setCreating(true);
    try {
      const expiresInHours = expiryDays === undefined ? undefined : expiryDays * 24;
      const data = await shareApi.create(diagramId, selectedRole, expiresInHours);
      const token = data.shareLink?.token ?? data.token;
      setCreatedToken(token);
      const url = `${globalThis.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      await loadLinks();
    } catch {
      toast("Could not create the share link", "error");
    } finally {
      setCreating(false);
    }
  }, [creating, diagramId, selectedRole, expiryDays, loadLinks, toast]);

  const handleDeleteLink = useCallback(
    async (token: string) => {
      try {
        await shareApi.deleteLink(token);
        await loadLinks();
      } catch {
        toast("Could not delete the link", "error");
      }
    },
    [loadLinks, toast],
  );

  const handleCopyExistingLink = useCallback(
    async (token: string) => {
      const url = `${globalThis.location.origin}/share/${token}`;
      try {
        await navigator.clipboard.writeText(url);
        setCopiedToken(token);
      } catch {
        toast("Could not copy the link", "error");
      }
    },
    [toast],
  );

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!copiedToken) return;
    const t = setTimeout(() => setCopiedToken(null), 2000);
    return () => clearTimeout(t);
  }, [copiedToken]);

  if (!open) return null;

  const sectionLabel = "mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted";

  function renderCopyButtonContent({
    copied: isCopied,
    creating: isCreating,
  }: {
    copied: boolean;
    creating: boolean;
  }) {
    if (isCopied) {
      return (
        <>
          <IconCheck size={14} />
          Copied!
        </>
      );
    }
    if (isCreating) return "Creating...";
    return (
      <>
        <IconCopy size={14} />
        Copy Link
      </>
    );
  }

  function renderLinksList() {
    if (loadingLinks) {
      return <p className="py-4 text-center text-sm text-text-muted">Loading...</p>;
    }
    if (links.length === 0) {
      return <p className="py-4 text-center text-sm text-text-muted">No active links</p>;
    }
    return links.map(renderLinkRow);
  }

  function renderLinkRow(link: ShareLink) {
    const isEditor = link.role === "editor";
    const { badgeText, badgeClass } = computeLinkBadge(link);
    return (
      <div
        key={link.token}
        className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-border/80"
      >
        {/* Icon circle */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isEditor ? "bg-primary/10 text-primary" : "bg-accent-coral/10 text-accent-coral"
          }`}
        >
          {isEditor ? <IconEdit size={14} /> : <IconEye size={14} />}
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {link.role.charAt(0).toUpperCase() + link.role.slice(1)} Link
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeClass}`}
            >
              {badgeText}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">{formatRelativeDate(link.createdAt)}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleCopyExistingLink(link.token)}
            className={`rounded-lg p-2 transition ${copiedToken === link.token ? "text-success" : "text-text-muted hover:bg-primary/10 hover:text-primary"}`}
            aria-label="Copy link"
            title="Copy link"
          >
            {copiedToken === link.token ? <IconCheck size={15} /> : <IconCopy size={15} />}
          </button>
          <button
            onClick={() => handleDeleteLink(link.token)}
            className="rounded-lg p-2 text-text-muted transition hover:bg-error/10 hover:text-error"
            aria-label="Delete link"
            title="Delete link"
          >
            <IconTrash size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Dialog
      label="Share Diagram"
      onClose={onClose}
      className="max-w-[560px] rounded-xl border border-border bg-surface-raised shadow-2xl"
    >
      <>
        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconShare size={20} />
            </div>
            <div>
              <h2 className={ui.h2}>Share Diagram</h2>
              <p className="mt-0.5 text-sm text-text-secondary">
                Manage access and collaboration links
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface hover:text-text-primary"
            aria-label="Close"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────── */}
        <div className="space-y-6 px-6 py-5">
          {/* ── Create New Link ───────────────────────── */}
          <section>
            <p className={sectionLabel}>Create New Link</p>

            <div className="grid grid-cols-2 gap-3">
              {/* Role selector */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary">Role</span>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className={ui.input}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </label>

              {/* Expiration input */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary">Expires in (days)</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                    <IconCalendar size={14} />
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={MAX_EXPIRY_DAYS}
                    step={1}
                    placeholder="e.g. 7"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    aria-invalid={expiryDays === "invalid"}
                    aria-describedby={expiryDays === "invalid" ? "share-expiry-error" : undefined}
                    className={`${ui.input} pl-8`}
                  />
                </div>
                {expiryDays === "invalid" && (
                  <p id="share-expiry-error" role="alert" className="text-xs text-error">
                    Enter a whole number of days from 1 to {MAX_EXPIRY_DAYS}.
                  </p>
                )}
              </label>
            </div>

            {/* Generated link preview */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-dark px-3 py-2.5">
                <span className="shrink-0 text-white/60">
                  <IconLink size={14} />
                </span>
                <span className="truncate font-[family-name:var(--font-family-mono)] text-xs text-white/80">
                  {linkUrl}
                </span>
              </div>
              <button
                onClick={handleCreateAndCopy}
                disabled={creating || expiryDays === "invalid"}
                className={`${ui.btn} ${ui.btnPrimary} shrink-0 gap-1.5`}
              >
                {renderCopyButtonContent({ copied, creating })}
              </button>
            </div>
          </section>

          {/* ── Active Links ──────────────────────────── */}
          <section>
            <p className={sectionLabel}>Active Links</p>

            <div className="space-y-2">{renderLinksList()}</div>
          </section>
        </div>

        {/* ── Footer ──────────────────────────────────── */}
        <div className="flex justify-end border-t border-border px-6 py-4">
          <button onClick={onClose} className={`${ui.btn} ${ui.btnPrimary}`}>
            Done
          </button>
        </div>
      </>
    </Dialog>
  );
}
