"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { ui } from "@/lib/ui";

type Folder = { id: string; name: string };

export default function DashboardActions({
  currentFolderId,
  folders: _folders,
}: {
  currentFolderId: string | null;
  folders: Folder[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function createDiagram() {
    setPending(true);
    setStatus(null);

    try {
      const response = await fetch("/api/diagrams", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Untitled", folderId: currentFolderId }),
      });

      if (response.status === 404) {
        setStatus("Diagram API is not ready yet (Issue #4).");
      } else if (!response.ok) {
        setStatus("Could not create diagram right now.");
      } else {
        const payload = (await response.json()) as { diagram?: { id?: string } };
        const diagramId = payload.diagram?.id;
        if (!diagramId) {
          setStatus("Diagram created, but missing id.");
          router.refresh();
          return;
        }
        router.push(`/board/${diagramId}`);
        router.refresh();
      }
    } catch {
      setStatus("Backend is unreachable.");
    } finally {
      setPending(false);
    }
  }

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected
    e.target.value = "";

    setPending(true);
    setStatus(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.type !== "excalidraw" || !Array.isArray(data.elements)) {
        setStatus("Invalid .excalidraw file.");
        setPending(false);
        return;
      }

      const title = file.name.replace(/\.(excalidraw|json)$/i, "") || "Imported";

      const response = await fetch("/api/diagrams", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          folderId: currentFolderId,
          elements: data.elements,
          appState: data.appState ?? {},
        }),
      });

      if (!response.ok) {
        setStatus("Failed to import diagram.");
      } else {
        const payload = (await response.json()) as { diagram?: { id?: string } };
        const diagramId = payload.diagram?.id;
        if (diagramId) {
          router.push(`/board/${diagramId}`);
          router.refresh();
        } else {
          setStatus("Imported, but missing id.");
          router.refresh();
        }
      }
    } catch {
      setStatus("Could not read file. Make sure it's a valid .excalidraw file.");
    } finally {
      setPending(false);
    }
  }, [router]);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex gap-3">
        <button
          className={`${ui.btn} ${ui.btnPrimary}`}
          onClick={createDiagram}
          disabled={pending}
        >
          {pending ? "Creating..." : "Create Diagram"}
        </button>
        <button
          className={`${ui.btn} ${ui.btnSecondary}`}
          onClick={() => fileInputRef.current?.click()}
          disabled={pending}
        >
          Import .excalidraw
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".excalidraw,.json"
          onChange={handleImport}
          className="hidden"
        />
      </div>
      {status && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
          {status}
        </p>
      )}
    </div>
  );
}
