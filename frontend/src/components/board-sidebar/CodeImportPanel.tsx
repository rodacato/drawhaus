import { useCallback, useEffect, useRef, useState } from "react";
import { ui } from "@/lib/ui";
import type { ExcalidrawApi } from "@/lib/types";
import { renderMermaid } from "@/lib/diagram-code/mermaid-renderer";
import { mermaidToElements } from "@/lib/diagram-code/convert-to-excalidraw";

type Props = {
  excalidrawApiRef: React.RefObject<ExcalidrawApi | null>;
  onClose: () => void;
};

const PLACEHOLDER = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do something]
    B -->|No| D[Do something else]
    C --> E[End]
    D --> E`;

export function CodeImportPanel({ excalidrawApiRef, onClose }: Props) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [replaceAll, setReplaceAll] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced preview render
  const updatePreview = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setPreview(null);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const svg = await renderMermaid(text);
        setPreview(svg);
        setError(null);
      } catch (err) {
        setPreview(null);
        setError(err instanceof Error ? err.message : "Invalid syntax");
      }
    }, 500);
  }, []);

  useEffect(() => {
    updatePreview(code);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code, updatePreview]);

  async function handleImport() {
    const api = excalidrawApiRef.current;
    if (!api || !code.trim()) return;
    setImporting(true);
    try {
      const newElements = await mermaidToElements(code);
      const existing = replaceAll ? [] : (api.getSceneElements() as any[]);
      api.updateScene({ elements: [...existing, ...newElements] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Import from Code
      </h3>

      {/* Format badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          Mermaid
        </span>
        <span className="text-xs text-gray-400">More formats coming soon</span>
      </div>

      {/* Code textarea */}
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        className="block h-52 w-full resize-y rounded-lg border border-border bg-gray-50 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/25"
      />

      {/* Preview area */}
      {preview && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-2">
            Preview
          </div>
          <div
            className="overflow-auto max-h-64 [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Replace toggle */}
      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={replaceAll}
          onChange={(e) => setReplaceAll(e.target.checked)}
          className="rounded border-gray-300"
        />
        Replace existing elements
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleImport}
          disabled={!code.trim() || !!error || importing}
          className={`${ui.btn} ${ui.btnPrimary} flex-1 text-xs`}
        >
          {importing ? "Importing..." : "Add to Canvas"}
        </button>
      </div>
    </div>
  );
}
