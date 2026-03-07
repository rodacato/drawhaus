"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui";

export default function DashboardActions() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
        body: JSON.stringify({ title: "Untitled" }),
      });

      if (response.status === 404) {
        setStatus("Diagram API is not ready yet (Issue #4).");
      } else if (!response.ok) {
        setStatus("Could not create diagram right now.");
      } else {
        setStatus("Diagram created.");
        router.refresh();
      }
    } catch {
      setStatus("Backend is unreachable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mb-6 space-y-3">
      <button
        className={`${ui.btn} ${ui.btnPrimary}`}
        onClick={createDiagram}
        disabled={pending}
      >
        {pending ? "Creating..." : "Create Diagram"}
      </button>
      {status && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
          {status}
        </p>
      )}
    </div>
  );
}
