import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawApi } from "@/lib/types";

const ExcalidrawLazy = lazy(async () => {
  const mod = await import("@excalidraw/excalidraw");
  return { default: mod.Excalidraw as unknown as ComponentType<ExcalidrawCanvasProps> };
});

type ExcalidrawCanvasProps = {
  excalidrawAPI?: (api: ExcalidrawApi) => void;
  initialData: {
    elements: unknown[];
    appState: Record<string, unknown>;
  };
  onChange?: (elements: readonly unknown[], appState: Record<string, unknown>) => void;
  viewModeEnabled?: boolean;
  objectsSnapModeEnabled?: boolean;
  UIOptions?: Record<string, unknown>;
};

export function ExcalidrawCanvas(props: ExcalidrawCanvasProps) {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-text-muted">Loading editor...</div>}>
      <ExcalidrawLazy
        {...props}
        UIOptions={{
          canvasActions: {
            toggleLibrary: false,
            export: false,
            saveAsImage: false,
            loadScene: false,
            saveToActiveFile: false,
          },
        }}
      />
    </Suspense>
  );
}
