"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui";

type Folder = { id: string; name: string };

export default function DashboardSidebar({
  folders,
  activeFolderId,
  searchQuery,
}: {
  folders: Folder[];
  activeFolderId?: string | null;
  searchQuery?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(searchQuery ?? "");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  function navigate(folderId?: string | null) {
    if (folderId === undefined) {
      router.push("/dashboard");
    } else if (folderId === null) {
      router.push("/dashboard?folderId=null");
    } else {
      router.push(`/dashboard?folderId=${folderId}`);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/dashboard?q=${encodeURIComponent(search.trim())}`);
    } else {
      router.push("/dashboard");
    }
  }

  async function createFolder() {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setCreating(false);
        router.refresh();
      }
    } catch {
      // silently fail
    }
  }

  async function deleteFolder(id: string) {
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        if (activeFolderId === id) router.push("/dashboard");
        else router.refresh();
      }
    } catch {
      // silently fail
    }
  }

  const isAll = activeFolderId === undefined && !searchQuery;
  const isUnfiled = activeFolderId === null;

  return (
    <aside className="w-56 shrink-0 space-y-4">
      <form onSubmit={handleSearch}>
        <input
          className={ui.input}
          type="search"
          placeholder="Search diagrams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      <nav className="space-y-1">
        <button
          onClick={() => navigate(undefined)}
          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
            isAll ? "bg-accent/10 font-medium text-accent" : "text-text-secondary hover:bg-surface-raised"
          }`}
          type="button"
        >
          All Diagrams
        </button>
        <button
          onClick={() => navigate(null)}
          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
            isUnfiled ? "bg-accent/10 font-medium text-accent" : "text-text-secondary hover:bg-surface-raised"
          }`}
          type="button"
        >
          Unfiled
        </button>

        <div className="pt-2">
          <div className="flex items-center justify-between px-3 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Folders</span>
            <button
              onClick={() => setCreating(true)}
              className="text-xs text-accent hover:text-accent-hover"
              type="button"
            >
              + New
            </button>
          </div>

          {creating && (
            <form
              onSubmit={(e) => { e.preventDefault(); createFolder(); }}
              className="px-1 pb-1"
            >
              <input
                className="w-full rounded border border-border bg-surface px-2 py-1 text-sm"
                placeholder="Folder name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                onBlur={() => { if (!newName.trim()) setCreating(false); }}
              />
            </form>
          )}

          {folders.map((folder) => (
            <div key={folder.id} className="group flex items-center">
              <button
                onClick={() => navigate(folder.id)}
                className={`flex-1 rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeFolderId === folder.id
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-text-secondary hover:bg-surface-raised"
                }`}
                type="button"
              >
                {folder.name}
              </button>
              <button
                onClick={() => deleteFolder(folder.id)}
                className="hidden rounded px-1 text-xs text-text-muted hover:text-red-600 group-hover:block"
                title="Delete folder"
                type="button"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
