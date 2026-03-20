import { useEffect } from "react";

export interface UseBoardShortcutsParams {
  hasEditLock: boolean;
  flushSave: () => Promise<void>;
  onToggleComments: () => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function useBoardShortcuts({ hasEditLock, flushSave, onToggleComments, toast }: UseBoardShortcutsParams) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        onToggleComments();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasEditLock) {
          flushSave().then(() => toast("Diagrama guardado", "success"));
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasEditLock, flushSave, onToggleComments, toast]);
}
