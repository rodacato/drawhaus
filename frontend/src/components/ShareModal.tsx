import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/ui";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  diagramId: string;
  onCreateLink?: (role: string, expiresAt?: string) => Promise<{ token: string } | null>;
  existingLinks?: Array<{
    id: string;
    token: string;
    role: string;
    expiresAt?: string | null;
    createdAt: string;
    views?: number;
  }>;
  onDeleteLink?: (linkId: string) => void;
}

/* ── Feather-style SVG icons ─────────────────────────────── */

function IconShare({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function IconX({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconCopy({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconEdit({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconEye({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconCalendar({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconLink({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function generateMockToken(): string {
  const seg = () => Math.random().toString(36).substring(2, 6);
  return `${seg()}-${seg()}`;
}

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `Created ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Created ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Created ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

/* ── Component ───────────────────────────────────────────── */

export function ShareModal({
  open,
  onClose,
  diagramId,
  onCreateLink,
  existingLinks,
  onDeleteLink,
}: ShareModalProps) {
  const [selectedRole, setSelectedRole] = useState("viewer");
  const [expiresAt, setExpiresAt] = useState("");
  const [copied, setCopied] = useState(false);
  const [mockToken] = useState(() => generateMockToken());

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const mockUrl = `${window.location.origin}/share/${mockToken}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(mockUrl).then(() => {
      setCopied(true);
    });
  }, [mockUrl]);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!open) return null;

  /* ── Default example links when no existingLinks prop ── */
  const defaultLinks: ShareModalProps["existingLinks"] = [
    {
      id: "demo-1",
      token: "abcd-efgh",
      role: "editor",
      expiresAt: null,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      views: undefined,
    },
    {
      id: "demo-2",
      token: "ijkl-mnop",
      role: "viewer",
      expiresAt: "2026-10-31T23:59:59Z",
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      views: 12,
    },
  ];

  const links = existingLinks ?? defaultLinks;

  const sectionLabel =
    "mb-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted";

  const modal = (
    <>
      {/* ── Backdrop ─────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* ── Modal container ──────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-[560px] rounded-xl border border-border bg-surface-raised shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Share Diagram"
          onClick={(e) => e.stopPropagation()}
        >
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
                  <span className="text-xs font-medium text-text-secondary">
                    Role
                  </span>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className={ui.input}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="commenter">Commenter</option>
                  </select>
                </label>

                {/* Expiration input */}
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary">
                    Expiration
                  </span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                      <IconCalendar size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Select date..."
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className={`${ui.input} pl-8`}
                    />
                  </div>
                </label>
              </div>

              {/* Generated link preview */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-dark px-3 py-2.5">
                  <span className="text-text-muted/60 shrink-0">
                    <IconLink size={14} />
                  </span>
                  <span className="truncate font-[family-name:var(--font-family-mono)] text-xs text-text-muted">
                    {mockUrl}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className={`${ui.btn} ${ui.btnPrimary} shrink-0 gap-1.5`}
                >
                  {copied ? (
                    <>
                      <IconCheck size={14} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <IconCopy size={14} />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* ── Active Links ──────────────────────────── */}
            <section>
              <p className={sectionLabel}>Active Links</p>

              <div className="space-y-2">
                {links.map((link) => {
                  const isEditor = link.role === "editor";
                  const expired = isExpired(link.expiresAt);
                  const isDefault = !existingLinks;
                  const showViews = link.views != null && link.views > 0;

                  /* Badge text */
                  let badgeText: string;
                  let badgeClass: string;
                  if (expired) {
                    badgeText = "Expired";
                    badgeClass =
                      "bg-error/10 text-error ring-error/20";
                  } else if (link.expiresAt) {
                    const d = new Date(link.expiresAt);
                    badgeText = `Expires ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                    badgeClass =
                      "bg-warning/10 text-warning ring-warning/20";
                  } else {
                    badgeText = "Active";
                    badgeClass =
                      "bg-success/10 text-success ring-success/20";
                  }

                  /* Meta line */
                  const metaParts: string[] = [];
                  if (isDefault && link.id === "demo-1") {
                    metaParts.push("Created 2 days ago");
                  } else if (isDefault && link.id === "demo-2") {
                    metaParts.push("Created 5 hours ago");
                  } else {
                    metaParts.push(formatRelativeDate(link.createdAt));
                  }
                  if (showViews) {
                    metaParts.push(`${link.views} views`);
                  }

                  return (
                    <div
                      key={link.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-border/80"
                    >
                      {/* Icon circle */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isEditor
                            ? "bg-primary/10 text-primary"
                            : "bg-accent-coral/10 text-accent-coral"
                        }`}
                      >
                        {isEditor ? (
                          <IconEdit size={14} />
                        ) : (
                          <IconEye size={14} />
                        )}
                      </div>

                      {/* Text content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {isDefault && link.id === "demo-1"
                              ? "Editor Link"
                              : isDefault && link.id === "demo-2"
                                ? "Public Viewer"
                                : `${link.role.charAt(0).toUpperCase() + link.role.slice(1)} Link`}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${badgeClass}`}
                          >
                            {badgeText}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {metaParts.join(" \u00B7 ")}
                        </p>
                      </div>

                      {/* Action button */}
                      {isDefault && link.id === "demo-1" ? (
                        <button
                          onClick={() => onDeleteLink?.(link.id)}
                          className="rounded-lg p-2 text-text-muted transition hover:bg-error/10 hover:text-error"
                          aria-label="Delete link"
                        >
                          <IconTrash size={15} />
                        </button>
                      ) : isDefault && link.id === "demo-2" ? (
                        <button
                          onClick={() => onDeleteLink?.(link.id)}
                          className={`${ui.btn} h-8 px-3 text-xs border border-border text-text-secondary hover:bg-error/10 hover:text-error hover:border-error/30 transition`}
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          onClick={() => onDeleteLink?.(link.id)}
                          className="rounded-lg p-2 text-text-muted transition hover:bg-error/10 hover:text-error"
                          aria-label="Delete link"
                        >
                          <IconTrash size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ── Footer ──────────────────────────────────── */}
          <div className="flex justify-end border-t border-border px-6 py-4">
            <button
              onClick={onClose}
              className={`${ui.btn} ${ui.btnPrimary}`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
