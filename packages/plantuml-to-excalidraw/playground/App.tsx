import { useState, useCallback, useEffect, useRef, useDeferredValue } from "react";
import {
  parsePlantUMLToExcalidraw,
  PlantUMLParseError,
  PlantUMLUnsupportedError,
} from "../src/index";
import type { ExcalidrawElementSkeleton } from "../src/types";
import { DEFAULT_CODE } from "./examples/class";
import { Editor } from "./components/Editor";
import { ExcalidrawCanvas } from "./components/ExcalidrawCanvas";
import { Examples } from "./components/Examples";

export function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [elements, setElements] = useState<ExcalidrawElementSkeleton[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const deferredElements = useDeferredValue(elements);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

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

        const rects = result.elements.filter((e) => e.type === "rectangle").length;
        const arrows = result.elements.filter((e) => e.type === "arrow").length;
        setStatus(
          `${rects} class${rects !== 1 ? "es" : ""}, ${arrows} relation${arrows !== 1 ? "s" : ""}, ${result.elements.length} total elements`,
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
            `${err.diagramType} diagrams are not yet supported. Currently supported: class diagrams.`,
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
          <button
            className="theme-toggle"
            onClick={() => setDarkMode((d) => !d)}
            title="Toggle dark mode"
          >
            {darkMode ? "\u2600\uFE0F" : "\uD83C\uDF19"}
          </button>
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
        <ExcalidrawCanvas elements={deferredElements} darkMode={darkMode} />
      </div>
    </div>
  );
}
