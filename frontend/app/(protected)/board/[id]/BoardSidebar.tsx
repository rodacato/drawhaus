"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Diagram = {
  id: string;
  title: string;
  updatedAt?: string;
  updated_at?: string;
};

type BoardSidebarProps = {
  userEmail: string;
  isOpen: boolean;
  onToggle: () => void;
};

export function BoardSidebar({ userEmail, isOpen, onToggle }: BoardSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const currentId = params.id as string;
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDiagrams();
    }
  }, [isOpen]);

  async function fetchDiagrams() {
    try {
      const res = await fetch("/api/diagrams", { credentials: "include" });
      if (!res.ok) return;
      const payload = await res.json();
      setDiagrams(Array.isArray(payload) ? payload : payload.diagrams ?? []);
    } catch {
      // silent
    }
  }

  async function createDiagram() {
    setCreating(true);
    try {
      const res = await fetch("/api/diagrams", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });
      if (res.ok) {
        const payload = await res.json();
        const id = payload.diagram?.id;
        if (id) {
          router.push(`/board/${id}`);
          router.refresh();
        }
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  }

  async function createShareLink(role: "viewer" | "editor") {
    setShareLoading(true);
    setShareCopied(false);
    try {
      const res = await fetch(`/api/share/${currentId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) return;
      const payload = await res.json();
      const token = payload.shareLink?.token;
      if (token) {
        const url = `${window.location.origin}/share/${token}`;
        setShareUrl(url);
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      // silent
    } finally {
      setShareLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Floating trigger button - centered vertically on left edge */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-0 top-1/2 z-50 -translate-y-1/2 flex h-12 w-6 items-center justify-center rounded-r-lg bg-[#1e1e2e]/80 text-white/60 shadow-lg backdrop-blur-sm transition hover:w-8 hover:bg-[#1e1e2e] hover:text-white"
          title="Open menu (⌘\)"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]"
          onClick={onToggle}
        />
      )}

      {/* Drawer panel */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col bg-[#1e1e2e] text-white/90 shadow-2xl transition-transform duration-200 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <span className="font-mono text-sm font-semibold tracking-tight text-white">
            drawhaus
          </span>
          <button
            onClick={onToggle}
            className="flex h-7 w-7 items-center justify-center rounded text-white/50 transition hover:bg-white/10 hover:text-white"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Create button */}
        <div className="border-b border-white/10 p-3">
          <button
            onClick={createDiagram}
            disabled={creating}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-accent font-mono text-xs font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {creating ? "Creating..." : "New diagram"}
          </button>
        </div>

        {/* Share section */}
        <div className="border-b border-white/10 p-3 space-y-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-white/40">
            Share
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => createShareLink("viewer")}
              disabled={shareLoading}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 font-mono text-xs text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              type="button"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View link
            </button>
            <button
              onClick={() => createShareLink("editor")}
              disabled={shareLoading}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 font-mono text-xs text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              type="button"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit link
            </button>
          </div>
          {shareUrl && (
            <div className="rounded-lg bg-white/5 p-2">
              <p className="break-all font-mono text-[10px] text-white/50">{shareUrl}</p>
              <p className="mt-1 font-mono text-[10px] text-emerald-400">
                {shareCopied ? "Copied to clipboard!" : ""}
              </p>
            </div>
          )}
        </div>

        {/* Diagram list */}
        <nav className="flex-1 overflow-y-auto p-2">
          {diagrams.length === 0 ? (
            <p className="px-2 py-4 text-center font-mono text-xs text-white/40">
              No diagrams yet
            </p>
          ) : (
            <ul className="space-y-0.5">
              {diagrams.map((d) => {
                const isActive = d.id === currentId;
                return (
                  <li key={d.id}>
                    <Link
                      href={`/board/${d.id}`}
                      className={`flex flex-col rounded-lg px-3 py-2 transition ${
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white/80"
                      }`}
                    >
                      <span className="truncate font-mono text-sm">
                        {d.title || "Untitled"}
                      </span>
                      <span className="font-mono text-[10px] text-white/30">
                        {d.updatedAt ?? d.updated_at ?? ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* Account footer */}
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 truncate font-mono text-xs text-white/50">
            {userEmail}
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="flex h-8 flex-1 items-center justify-center rounded-lg border border-white/10 font-mono text-xs text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </Link>
            <button
              onClick={logout}
              className="flex h-8 flex-1 items-center justify-center rounded-lg border border-white/10 font-mono text-xs text-white/60 transition hover:bg-white/5 hover:text-white"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
