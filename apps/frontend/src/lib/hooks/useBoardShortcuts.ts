import { useEffect } from "react";

export interface UseBoardShortcutsParams {
  flushSave: () => Promise<boolean>;
  onToggleComments: () => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function useBoardShortcuts({ flushSave, onToggleComments, toast }: UseBoardShortcutsParams) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        onToggleComments();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        flushSave().then((ok) => {
          toast(ok ? "Diagrama guardado" : "Error al guardar el diagrama", ok ? "success" : "error");
        });
      }
    }
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [flushSave, onToggleComments, toast]);
}
