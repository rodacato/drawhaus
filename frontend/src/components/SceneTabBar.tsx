import { useState } from "react";
import type { SceneInfo } from "@/lib/hooks/useCollaboration";

type SceneTabBarProps = {
  scenes: SceneInfo[];
  activeSceneId: string | null;
  switchingScene: boolean;
  canEdit: boolean;
  onSwitch: (sceneId: string) => void;
  onCreate: (name?: string) => void;
  onDelete: (sceneId: string) => void;
  onRename: (sceneId: string, name: string) => void;
};

export function SceneTabBar({
  scenes,
  activeSceneId,
  switchingScene,
  canEdit,
  onSwitch,
  onCreate,
  onDelete,
  onRename,
}: SceneTabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (scenes.length <= 1 && !canEdit) return null;

  const showDelete = canEdit && scenes.length > 1;

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-lg bg-white px-2 py-1 shadow-sm">
      {switchingScene && (
        <div className="mr-1 text-[10px] text-gray-400">Loading...</div>
      )}
      {scenes.map((scene) => {
        const isActive = scene.id === activeSceneId;
        return (
          <div key={scene.id} className="flex items-center">
            {editingId === scene.id ? (
              <input
                className="w-24 rounded border border-gray-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => {
                  if (editName.trim()) onRename(scene.id, editName.trim());
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (editName.trim()) onRename(scene.id, editName.trim());
                    setEditingId(null);
                  }
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
              />
            ) : (
              <button
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => onSwitch(scene.id)}
                onDoubleClick={() => {
                  if (!canEdit) return;
                  setEditingId(scene.id);
                  setEditName(scene.name);
                }}
              >
                {scene.name}
              </button>
            )}
            {showDelete && editingId !== scene.id && (
              <button
                className={`rounded p-0.5 transition-opacity ${
                  isActive
                    ? "text-gray-400 opacity-100 hover:bg-gray-100 hover:text-gray-600"
                    : "pointer-events-none opacity-0"
                }`}
                onClick={() => onDelete(scene.id)}
                title="Delete scene"
                tabIndex={isActive ? 0 : -1}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
      {canEdit && (
        <button
          className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onClick={() => onCreate()}
          title="Add scene"
        >
          +
        </button>
      )}
    </div>
  );
}
