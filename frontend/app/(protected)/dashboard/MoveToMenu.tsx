"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Folder = { id: string; name: string };

export default function MoveToMenuClient({
  diagramId,
  folders,
  currentFolderId,
}: {
  diagramId: string;
  folders: Folder[];
  currentFolderId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function moveTo(folderId: string | null) {
    setOpen(false);
    try {
      await fetch(`/api/diagrams/${diagramId}/move`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      router.refresh();
    } catch {
      // silently fail
    }
  }

  const options = [
    { id: null, name: "Unfiled" },
    ...folders,
  ].filter((f) => f.id !== currentFolderId);

  if (options.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-secondary hover:bg-surface-raised transition"
        type="button"
      >
        Move to...
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-lg border border-border bg-surface-raised py-1 shadow-lg">
            {options.map((opt) => (
              <button
                key={opt.id ?? "unfiled"}
                onClick={() => moveTo(opt.id)}
                className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface transition"
                type="button"
              >
                {opt.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
