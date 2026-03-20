import { useEffect, useRef, useCallback, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawElementSkeleton } from "../../src/types";

// Lazy-load Excalidraw to avoid SSR issues
let ExcalidrawModule: typeof import("@excalidraw/excalidraw") | null = null;

interface ExcalidrawCanvasProps {
  elements: ExcalidrawElementSkeleton[];
  darkMode: boolean;
}

export function ExcalidrawCanvas({ elements, darkMode }: ExcalidrawCanvasProps) {
  const apiRef = useRef<any>(null);
  const [Excalidraw, setExcalidraw] = useState<any>(null);
  const [convertFn, setConvertFn] = useState<any>(null);

  // Load Excalidraw dynamically
  useEffect(() => {
    if (ExcalidrawModule) {
      setExcalidraw(() => ExcalidrawModule!.Excalidraw);
      setConvertFn(() => ExcalidrawModule!.convertToExcalidrawElements);
      return;
    }
    import("@excalidraw/excalidraw").then((mod) => {
      ExcalidrawModule = mod;
      setExcalidraw(() => mod.Excalidraw);
      setConvertFn(() => mod.convertToExcalidrawElements);
    });
  }, []);

  // Update scene when elements change
  useEffect(() => {
    const api = apiRef.current;
    if (!api || !convertFn || elements.length === 0) return;

    try {
      const excalidrawElements = convertFn(elements as any);
      api.updateScene({ elements: excalidrawElements });
      // Small delay to let elements render before scrolling
      setTimeout(() => {
        api.scrollToContent(excalidrawElements, { fitToContent: true, animate: true });
      }, 50);
    } catch {
      // Conversion error — ignore, elements may be partial
    }
  }, [elements, convertFn]);

  // Clear canvas when elements are empty
  useEffect(() => {
    const api = apiRef.current;
    if (!api || elements.length > 0) return;
    api.updateScene({ elements: [] });
  }, [elements]);

  const handleApi = useCallback((api: any) => {
    apiRef.current = api;
  }, []);

  if (!Excalidraw) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-muted)",
          fontSize: 14,
        }}
      >
        Loading canvas...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Excalidraw
        excalidrawAPI={handleApi}
        theme={darkMode ? "dark" : "light"}
        viewModeEnabled={false}
        UIOptions={{
          canvasActions: {
            export: false,
            loadScene: false,
            saveToActiveFile: false,
          },
        }}
        initialData={{
          appState: {
            viewBackgroundColor: darkMode ? "#0f172a" : "#ffffff",
          },
        }}
      />
    </div>
  );
}
