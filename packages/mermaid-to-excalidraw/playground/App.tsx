import { useState, useCallback, useEffect, useRef, useMemo, useDeferredValue } from "react";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { DEFAULT_CODE, FLAT_SUPPORTED_EXAMPLES } from "./examples/mermaid";
import { Editor } from "./components/Editor";
import { ExcalidrawCanvas } from "./components/ExcalidrawCanvas";
import { Examples } from "./components/Examples";
import { ExampleNav } from "./components/ExampleNav";
import { MermaidPreview } from "./components/MermaidPreview";

// Known unsupported diagram types (we detect these to show a friendly warning)
const UNSUPPORTED_PREFIXES = [
  "erDiagram",
  "stateDiagram",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitGraph",
  "quadrantChart",
  "journey",
  "requirementDiagram",
  "C4Context",
  "sankey",
  "xychart",
  "block",
];

function detectUnsupportedType(code: string): string | null {
  const firstLine = code.trim().split("\n")[0].trim();
  for (const prefix of UNSUPPORTED_PREFIXES) {
    if (firstLine.startsWith(prefix)) {
      return prefix;
    }
  }
  return null;
}

export function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [elements, setElements] = useState<any[]>([]);
  const [files, setFiles] = useState<Record<string, any> | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const deferredElements = useDeferredValue(elements);

  // Track current example index
  const currentIndex = useMemo(
    () => FLAT_SUPPORTED_EXAMPLES.findIndex((f) => f.example.code === code),
    [code],
  );

  const goToExample = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, FLAT_SUPPORTED_EXAMPLES.length - 1));
    setCode(FLAT_SUPPORTED_EXAMPLES[clamped].example.code);
  }, []);

  // Arrow key navigation (only when editor textarea is not focused)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToExample(currentIndex <= 0 ? FLAT_SUPPORTED_EXAMPLES.length - 1 : currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToExample(currentIndex < 0 ? 0 : (currentIndex + 1) % FLAT_SUPPORTED_EXAMPLES.length);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, goToExample]);

  // Parse on code change (debounced, async)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = code.trim();
    if (!trimmed) {
      setElements([]);
      setFiles(undefined);
      setError(null);
      setWarning(null);
      setStatus(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      // Check for unsupported diagram types first
      const unsupported = detectUnsupportedType(trimmed);
      if (unsupported) {
        setElements([]);
        setFiles(undefined);
        setError(null);
        setWarning(
          `${unsupported} diagrams are not yet supported by the Excalidraw converter. Currently supported: flowchart, class, sequence.`,
        );
        setStatus(null);
        return;
      }

      // Parse async
      parseMermaidToExcalidraw(trimmed)
        .then((result) => {
          setElements(result.elements);
          setFiles(result.files ?? undefined);
          setError(null);
          setWarning(null);

          const arrows = result.elements.filter((e: any) => e.type === "arrow").length;
          const shapes = result.elements.filter(
            (e: any) => e.type !== "arrow" && e.type !== "text",
          ).length;
          setStatus(
            `${shapes} shape${shapes !== 1 ? "s" : ""}, ${arrows} relation${arrows !== 1 ? "s" : ""}, ${result.elements.length} total elements`,
          );
        })
        .catch((err) => {
          setElements([]);
          setFiles(undefined);
          setError(err instanceof Error ? err.message : "Unknown error");
          setWarning(null);
          setStatus(null);
        });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const handleExampleSelect = useCallback((exampleCode: string) => {
    setCode(exampleCode);
  }, []);

  return (
    <div className="app">
      <div className="left-panel">
        <div className="header">
          <h1>
            Mermaid to Excalidraw <span>Playground</span>
          </h1>
        </div>
        <Editor
          code={code}
          onChange={handleCodeChange}
          error={error}
          warning={warning}
          status={status}
        />
        <MermaidPreview code={code} />
        <Examples activeCode={code} onSelect={handleExampleSelect} />
      </div>
      <div className="right-panel">
        <ExampleNav
          currentIndex={currentIndex}
          total={FLAT_SUPPORTED_EXAMPLES.length}
          currentExample={currentIndex >= 0 ? FLAT_SUPPORTED_EXAMPLES[currentIndex] : null}
          onPrev={() => goToExample(currentIndex <= 0 ? FLAT_SUPPORTED_EXAMPLES.length - 1 : currentIndex - 1)}
          onNext={() => goToExample(currentIndex < 0 ? 0 : (currentIndex + 1) % FLAT_SUPPORTED_EXAMPLES.length)}
        />
        <ExcalidrawCanvas elements={deferredElements} files={files} />
      </div>
    </div>
  );
}
