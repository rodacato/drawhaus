import { lazy, Suspense, type ComponentType } from "react";
import "@excalidraw/excalidraw/index.css";
import { useTheme } from "@/contexts/ThemeContext";
import type { ExcalidrawApi } from "@/lib/types";

const ExcalidrawLazy = lazy(async () => {
  const mod = await import("@excalidraw/excalidraw");
  return { default: mod.Excalidraw as unknown as ComponentType<ExcalidrawCanvasProps> };
});

type ExcalidrawCanvasProps = {
  readonly excalidrawAPI?: (api: ExcalidrawApi) => void;
  readonly initialData: {
    elements: unknown[];
    appState: Record<string, unknown>;
  };
  readonly onChange?: (elements: readonly unknown[], appState: Record<string, unknown>) => void;
  readonly viewModeEnabled?: boolean;
  readonly objectsSnapModeEnabled?: boolean;
  readonly UIOptions?: Record<string, unknown>;
  readonly theme?: "light" | "dark";
};

export function ExcalidrawCanvas(props: Omit<ExcalidrawCanvasProps, "theme">) {
  const { theme } = useTheme();
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center text-text-muted">
          Loading editor...
        </div>
      }
    >
      <ExcalidrawLazy
        {...props}
        theme={theme}
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
