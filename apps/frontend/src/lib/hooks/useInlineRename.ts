import { useState, useCallback } from "react";

export function useInlineRename(
  initialTitle: string,
  onRename: (id: string, title: string) => void,
  diagramId: string,
) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(initialTitle || "Untitled");

  const startRenaming = useCallback(() => {
    setRenameValue(initialTitle || "Untitled");
    setRenaming(true);
  }, [initialTitle]);

  const commitRename = useCallback(() => {
    if (renameValue.trim()) {
      onRename(diagramId, renameValue);
    }
    setRenaming(false);
  }, [diagramId, onRename, renameValue]);

  const cancelRename = useCallback(() => {
    setRenaming(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") cancelRename();
    },
    [cancelRename],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      commitRename();
    },
    [commitRename],
  );

  return {
    renaming,
    renameValue,
    setRenameValue,
    startRenaming,
    commitRename,
    cancelRename,
    handleKeyDown,
    handleSubmit,
  };
}
