"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { BoardSidebar } from "./BoardSidebar";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);
const ExcalidrawCanvas = Excalidraw as unknown as ComponentType<{
  initialData: {
    elements: unknown[];
    appState: Record<string, unknown>;
  };
  onChange: (elements: readonly unknown[], appState: Record<string, unknown>) => void;
}>;

type BoardEditorProps = {
  diagramId: string;
  title: string;
  userEmail: string;
  initialElements: unknown[];
  initialAppState: Record<string, unknown>;
};

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default function BoardEditor({
  diagramId,
  title,
  userEmail,
  initialElements,
  initialAppState,
}: BoardEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedAt = useRef<string | null>(null);

  const initialData = useMemo(
    () => ({
      elements: initialElements,
      appState: {
        ...initialAppState,
        gridModeEnabled: true,
        theme: "light",
        viewBackgroundColor: "#f8f9fc",
      },
    }),
    [initialElements, initialAppState]
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Keyboard shortcut to toggle sidebar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const persistScene = useCallback(async function persistScene(elements: unknown[], appState: Record<string, unknown>) {
    setSaveState("saving");
    try {
      const sanitizedAppState = jsonSafe({
        ...appState,
        collaborators: undefined,
      });
      const response = await fetch(`/api/diagrams/${diagramId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elements: jsonSafe(elements),
          appState: sanitizedAppState,
        }),
      });

      if (!response.ok) {
        setSaveState("error");
        return;
      }
      lastSavedAt.current = new Date().toLocaleTimeString();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [diagramId]);

  const onChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      setSaveState("pending");
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        persistScene([...elements], appState);
      }, 1200);
    },
    [persistScene]
  );

  const saveLabel = {
    idle: "Ready",
    pending: "Unsaved",
    saving: "Saving...",
    saved: lastSavedAt.current ? `Saved ${lastSavedAt.current}` : "Saved",
    error: "Error",
  }[saveState];

  const saveColor = {
    idle: "bg-white/80 text-black/50",
    pending: "bg-amber-100 text-amber-700",
    saving: "bg-blue-100 text-blue-700",
    saved: "bg-emerald-100 text-emerald-700",
    error: "bg-red-100 text-red-700",
  }[saveState];

  return (
    <div className="relative h-screen w-screen">
      {/* Sidebar drawer */}
      <BoardSidebar
        userEmail={userEmail}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Title - next to Excalidraw menu, matching its style */}
      <div className="pointer-events-none fixed left-16 top-3 z-20 flex items-center gap-3">
        <div className="pointer-events-auto rounded-lg bg-white px-4 py-2 shadow-sm">
          <span className="text-lg font-medium text-[#1b1b1f]">
            {title || "Untitled"}
          </span>
        </div>
        <div className={`pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${saveColor}`}>
          {saveLabel}
        </div>
      </div>

      {/* Fullscreen Excalidraw canvas */}
      <div className="h-full w-full">
        <ExcalidrawCanvas
          initialData={initialData}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
