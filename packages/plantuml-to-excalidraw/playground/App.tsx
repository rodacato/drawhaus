import { useState, useCallback, useEffect, useRef, useMemo, useDeferredValue } from "react";
import {
  parsePlantUMLToExcalidraw,
  PlantUMLParseError,
  PlantUMLUnsupportedError,
} from "../src/index";
import type { ExcalidrawElementSkeleton } from "../src/types";
import { DEFAULT_CODE, FLAT_SUPPORTED_EXAMPLES } from "./examples/class";
import { Editor } from "./components/Editor";
import { ExcalidrawCanvas } from "./components/ExcalidrawCanvas";
import { Examples } from "./components/Examples";
import { ExampleNav } from "./components/ExampleNav";

export function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [elements, setElements] = useState<ExcalidrawElementSkeleton[]>([]);
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

  // Parse on code change (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = code.trim();
    if (!trimmed) {
      setElements([]);
      setError(null);
      setWarning(null);
      setStatus(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      try {
        const result = parsePlantUMLToExcalidraw(code);
        setElements(result.elements);
        setError(null);
        setWarning(null);

        const arrows = result.elements.filter((e) => e.type === "arrow").length;
        const ellipses = result.elements.filter((e) => e.type === "ellipse").length;
        const rects = result.elements.filter((e) => e.type === "rectangle").length;
        const shapes = rects + ellipses;
        setStatus(
          `${result.diagramType} · ${shapes} shape${shapes !== 1 ? "s" : ""}, ${arrows} relation${arrows !== 1 ? "s" : ""}, ${result.elements.length} total elements`,
        );
      } catch (err) {
        if (err instanceof PlantUMLParseError) {
          setError(`Line ${err.line}, Column ${err.column}: ${err.message}`);
          setWarning(null);
          setStatus(null);
        } else if (err instanceof PlantUMLUnsupportedError) {
          setElements([]);
          setError(null);
          setWarning(
            `${err.diagramType} diagrams are not yet supported. Currently supported: class, object, use case, state, component, deployment.`,
          );
          setStatus(null);
        } else {
          setError(err instanceof Error ? err.message : "Unknown error");
          setWarning(null);
          setStatus(null);
        }
      }
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
            PlantUML to Excalidraw <span>Playground</span>
          </h1>
        </div>
        <Editor
          code={code}
          onChange={handleCodeChange}
          error={error}
          warning={warning}
          status={status}
        />
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
        <ExcalidrawCanvas elements={deferredElements} />
      </div>
    </div>
  );
}
