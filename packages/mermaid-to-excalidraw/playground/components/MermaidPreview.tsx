import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidPreviewProps {
  code: string;
}

let initialized = false;

export function MermaidPreview({ code }: MermaidPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const renderIdRef = useRef(0);

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
      });
      initialized = true;
    }

    const trimmed = code.trim();
    if (!trimmed || !containerRef.current) {
      if (containerRef.current) containerRef.current.innerHTML = "";
      setError(null);
      return;
    }

    const currentId = ++renderIdRef.current;
    const renderKey = `mermaid-preview-${currentId}`;

    (async () => {
      try {
        const { svg } = await mermaid.render(renderKey, trimmed);
        // Only update if this is still the latest render
        if (currentId === renderIdRef.current && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (currentId === renderIdRef.current) {
          setError(err instanceof Error ? err.message : "Render error");
          if (containerRef.current) containerRef.current.innerHTML = "";
        }
      }
    })();
  }, [code]);

  return (
    <div className="mermaid-preview">
      <div className="mermaid-preview-header">Mermaid Reference</div>
      <div className="mermaid-preview-content">
        {error ? (
          <div className="mermaid-preview-error">{error}</div>
        ) : (
          <div ref={containerRef} />
        )}
      </div>
    </div>
  );
}
