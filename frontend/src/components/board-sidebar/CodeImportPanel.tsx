import { useCallback, useEffect, useRef, useState } from "react";
import { ui } from "@/lib/ui";
import type { ExcalidrawApi } from "@/lib/types";
import { renderMermaid } from "@/lib/diagram-code/mermaid-renderer";
import {
  mermaidToElements,
  plantumlToElements,
} from "@/lib/diagram-code/convert-to-excalidraw";
import {
  PlantUMLUnsupportedError,
} from "@/lib/diagram-code/plantuml-to-excalidraw";
import { PlantUMLParseError } from "@/lib/diagram-code/plantuml-parser";

type Format = "mermaid" | "plantuml";

type Props = {
  excalidrawApiRef: React.RefObject<ExcalidrawApi | null>;
  onClose: () => void;
};

type ValidationInfo = {
  entityCount: number;
  relationCount: number;
} | null;

const MERMAID_PLACEHOLDER = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do something]
    B -->|No| D[Do something else]
    C --> E[End]
    D --> E`;

const PLANTUML_PLACEHOLDER = `@startuml
class User {
  +name: string
  -email: string
  +login(): void
}
class Order {
  +id: number
  +total: number
}
User --> Order : places
@enduml`;

function detectFormat(code: string): Format {
  const trimmed = code.trimStart();
  if (
    trimmed.startsWith("@startuml") ||
    trimmed.startsWith("@startactivity")
  ) {
    return "plantuml";
  }
  return "mermaid";
}

export function CodeImportPanel({ excalidrawApiRef, onClose }: Props) {
  const [code, setCode] = useState("");
  const [format, setFormat] = useState<Format>("mermaid");
  const [autoDetected, setAutoDetected] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [replaceAll, setReplaceAll] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [validationInfo, setValidationInfo] = useState<ValidationInfo>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const userOverrodeFormat = useRef(false);

  // Auto-detect format on code change (unless user manually overrode)
  useEffect(() => {
    if (!userOverrodeFormat.current && code.trim()) {
      const detected = detectFormat(code);
      setFormat(detected);
      setAutoDetected(true);
    } else {
      setAutoDetected(false);
    }
  }, [code]);

  function handleFormatChange(newFormat: Format) {
    userOverrodeFormat.current = true;
    setAutoDetected(false);
    setFormat(newFormat);
  }

  // Debounced preview render
  const updatePreview = useCallback(
    (text: string, fmt: Format) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!text.trim()) {
        setPreview(null);
        setError(null);
        setIsFallback(false);
        setValidationInfo(null);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        try {
          if (fmt === "mermaid") {
            const svg = await renderMermaid(text);
            setPreview(svg);
            setValidationInfo(null);
          } else {
            // For PlantUML, validate parse and extract stats for feedback
            try {
              const result = plantumlToElements(text);
              setPreview(null);
              setIsFallback(false);
              // Extract entity/relation counts from the parsed elements
              const rects = result.elements.filter(
                (e: { type: string }) => e.type === "rectangle",
              ).length;
              const arrows = result.elements.filter(
                (e: { type: string }) => e.type === "arrow",
              ).length;
              setValidationInfo({
                entityCount: rects,
                relationCount: arrows,
              });
            } catch (err) {
              if (err instanceof PlantUMLUnsupportedError) {
                setPreview(null);
                setIsFallback(true);
                setValidationInfo(null);
                setError(
                  `${err.diagramType} diagrams are not yet supported for editable import.`,
                );
                return;
              }
              throw err;
            }
          }
          setError(null);
        } catch (err) {
          setPreview(null);
          setIsFallback(false);
          setValidationInfo(null);
          if (err instanceof PlantUMLParseError) {
            setError(`Line ${err.line}, Column ${err.column}: ${err.message}`);
          } else {
            setError(err instanceof Error ? err.message : "Invalid syntax");
          }
        }
      }, 500);
    },
    [],
  );

  useEffect(() => {
    updatePreview(code, format);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code, format, updatePreview]);

  async function handleImport() {
    const api = excalidrawApiRef.current;
    if (!api || !code.trim()) return;
    setImporting(true);
    try {
      let newElements: unknown[];
      if (format === "mermaid") {
        newElements = await mermaidToElements(code);
      } else {
        const result = plantumlToElements(code);
        newElements = result.elements;
      }
      const existing = replaceAll ? [] : (api.getSceneElements() as any[]);
      api.updateScene({ elements: [...existing, ...newElements] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert");
    } finally {
      setImporting(false);
    }
  }

  const placeholder =
    format === "mermaid" ? MERMAID_PLACEHOLDER : PLANTUML_PLACEHOLDER;

  const buttonLabel = importing
    ? "Importing..."
    : validationInfo && format === "plantuml"
      ? `Add ${validationInfo.entityCount} element${validationInfo.entityCount !== 1 ? "s" : ""} to Canvas`
      : "Add to Canvas";

  return (
    <div className="space-y-3">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Import from Code
      </h3>

      {/* Format selector */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleFormatChange("mermaid")}
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
            format === "mermaid"
              ? "bg-blue-50 text-blue-700"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Mermaid
        </button>
        <button
          onClick={() => handleFormatChange("plantuml")}
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
            format === "plantuml"
              ? "bg-blue-50 text-blue-700"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          PlantUML
        </button>
        {autoDetected && code.trim() && (
          <span className="text-[10px] text-gray-400 italic">
            auto-detected
          </span>
        )}
      </div>

      {/* Code textarea */}
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="block h-52 w-full resize-y rounded-lg border border-border bg-gray-50 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/25"
      />

      {/* PlantUML validation feedback (no SVG preview yet) */}
      {validationInfo && format === "plantuml" && !error && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Valid class diagram — {validationInfo.entityCount} class{validationInfo.entityCount !== 1 ? "es" : ""}, {validationInfo.relationCount} relation{validationInfo.relationCount !== 1 ? "s" : ""}
        </div>
      )}

      {/* Unsupported diagram type warning */}
      {isFallback && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 space-y-1">
          <div className="flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Diagram type not supported yet
          </div>
          <p>{error}</p>
          <p className="text-amber-600">Currently supported: class diagrams (class, interface, enum, abstract). Sequence and activity diagrams are coming soon.</p>
        </div>
      )}

      {/* Preview area (Mermaid SVG) */}
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
      {error && !isFallback && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 space-y-1">
          <div className="font-medium">Syntax error</div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-red-500 leading-relaxed">
            {error}
          </pre>
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
          disabled={!code.trim() || !!error || isFallback || importing}
          className={`${ui.btn} ${ui.btnPrimary} flex-1 text-xs`}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
