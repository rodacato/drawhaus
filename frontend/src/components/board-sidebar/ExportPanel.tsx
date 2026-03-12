import { useCallback, useEffect, useState } from "react";
import { driveApi } from "@/api/drive";
import type { ExcalidrawApi } from "@/lib/types";

function DriveExportButton({
  getSceneData,
  onStatus,
}: {
  getSceneData: () => { elements: unknown[]; appState: unknown; files: unknown } | null;
  onStatus: (msg: string | null) => void;
}) {
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    driveApi.getStatus().then((s) => setDriveConnected(s.connected)).catch(() => setDriveConnected(false));
  }, []);

  if (driveConnected === null || driveConnected === false) return null;

  async function handleDriveExport() {
    const data = getSceneData();
    if (!data) return;
    setExporting(true);
    onStatus(null);
    try {
      const content = JSON.stringify({
        type: "excalidraw",
        version: 2,
        source: "drawhaus",
        elements: data.elements,
        appState: data.appState,
      }, null, 2);

      await driveApi.export({
        format: "excalidraw",
        targetFolderId: "root",
        content,
        fileName: `diagram-${new Date().toISOString().slice(0, 10)}.excalidraw`,
      });
      onStatus("Saved to Drive!");
    } catch {
      onStatus("Drive export failed");
    } finally {
      setExporting(false);
      setTimeout(() => onStatus(null), 3000);
    }
  }

  return (
    <>
      <div className="my-2 border-t border-gray-100" />
      <button onClick={handleDriveExport} disabled={exporting} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>
        </span>
        <div><div className="font-medium">{exporting ? "Saving..." : "Google Drive"}</div><div className="text-xs text-gray-400">Export to Drive</div></div>
      </button>
    </>
  );
}

export function ExportPanel({ excalidrawApiRef }: { excalidrawApiRef: React.RefObject<ExcalidrawApi | null> }) {
  const [status, setStatus] = useState<string | null>(null);

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

  async function handleExport(type: "png" | "svg" | "copy") {
    const data = getSceneData();
    if (!data) return;
    try {
      if (type === "png") {
        const { exportToBlob } = await import("@excalidraw/excalidraw");
        const blob = await exportToBlob({ elements: data.elements, appState: { ...data.appState, exportWithDarkMode: false }, files: data.files });
        download(blob, "diagram.png");
        setStatus("PNG exported");
      } else if (type === "svg") {
        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const svg = await exportToSvg({ elements: data.elements, appState: { ...data.appState, exportWithDarkMode: false }, files: data.files });
        const svgStr = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgStr], { type: "image/svg+xml" });
        download(blob, "diagram.svg");
        setStatus("SVG exported");
      } else {
        const { exportToBlob } = await import("@excalidraw/excalidraw");
        const blob = await exportToBlob({ elements: data.elements, appState: { ...data.appState, exportWithDarkMode: false }, files: data.files });
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setStatus("Copied!");
      }
    } catch {
      setStatus("Failed");
    }
    setTimeout(() => setStatus(null), 2000);
  }

  return (
    <div className="space-y-1">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Export</h3>
      {status && (
        <div className="mb-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">{status}</div>
      )}
      <button onClick={() => handleExport("png")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
        </span>
        <div><div className="font-medium">PNG</div><div className="text-xs text-gray-400">Raster image</div></div>
      </button>
      <button onClick={() => handleExport("svg")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
        </span>
        <div><div className="font-medium">SVG</div><div className="text-xs text-gray-400">Vector format</div></div>
      </button>
      <div className="my-2 border-t border-gray-100" />
      <button onClick={() => handleExport("copy")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
        </span>
        <div><div className="font-medium">Copy PNG</div><div className="text-xs text-gray-400">To clipboard</div></div>
      </button>
      <DriveExportButton getSceneData={getSceneData} onStatus={setStatus} />
    </div>
  );
}
