import { useCallback, useState, useRef, useEffect } from "react";
import type { ExcalidrawApi } from "@/lib/types";

type ExportMenuProps = {
  excalidrawApiRef: React.RefObject<ExcalidrawApi | null>;
};

export function ExportMenu({ excalidrawApiRef }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const getSceneData = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) return null;
    return {
      elements: api.getSceneElements() as Parameters<typeof import("@excalidraw/excalidraw")["exportToBlob"]>[0]["elements"],
      appState: api.getAppState() as Parameters<typeof import("@excalidraw/excalidraw")["exportToBlob"]>[0]["appState"],
      files: api.getFiles() as Parameters<typeof import("@excalidraw/excalidraw")["exportToBlob"]>[0]["files"],
    };
  }, [excalidrawApiRef]);

  const download = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportPNG = useCallback(async () => {
    const data = getSceneData();
    if (!data) return;
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: data.elements,
        appState: { ...data.appState, exportWithDarkMode: false },
        files: data.files,
      });
      download(blob, "diagram.png");
      setStatus("PNG exported");
    } catch {
      setStatus("Export failed");
    }
    setOpen(false);
    setTimeout(() => setStatus(null), 2000);
  }, [getSceneData, download]);

  const handleExportSVG = useCallback(async () => {
    const data = getSceneData();
    if (!data) return;
    try {
      const { exportToSvg } = await import("@excalidraw/excalidraw");
      const svg = await exportToSvg({
        elements: data.elements,
        appState: { ...data.appState, exportWithDarkMode: false },
        files: data.files,
      });
      const svgStr = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgStr], { type: "image/svg+xml" });
      download(blob, "diagram.svg");
      setStatus("SVG exported");
    } catch {
      setStatus("Export failed");
    }
    setOpen(false);
    setTimeout(() => setStatus(null), 2000);
  }, [getSceneData, download]);

  const handleCopyPNG = useCallback(async () => {
    const data = getSceneData();
    if (!data) return;
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: data.elements,
        appState: { ...data.appState, exportWithDarkMode: false },
        files: data.files,
      });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setStatus("Copied to clipboard");
    } catch {
      setStatus("Copy failed");
    }
    setOpen(false);
    setTimeout(() => setStatus(null), 2000);
  }, [getSceneData]);

  return (
    <div ref={menuRef} className="relative flex h-full">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center rounded-lg bg-white px-3 text-sm font-medium text-[#1b1b1f] shadow-sm hover:bg-gray-50 transition-colors"
        title="Export"
      >
        {status ? (
          <span className="text-xs">{status}</span>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v7M4 6l3-4 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 10v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-48 rounded-lg bg-white py-1 shadow-lg border border-gray-100">
          <button
            onClick={handleExportPNG}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <span className="text-base">PNG</span>
            <span className="text-xs text-gray-400">image</span>
          </button>
          <button
            onClick={handleExportSVG}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <span className="text-base">SVG</span>
            <span className="text-xs text-gray-400">vector</span>
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={handleCopyPNG}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <span className="text-base">Copy PNG</span>
            <span className="text-xs text-gray-400">clipboard</span>
          </button>
        </div>
      )}
    </div>
  );
}
