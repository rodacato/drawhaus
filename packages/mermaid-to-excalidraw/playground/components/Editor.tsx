import { useCallback, useRef } from "react";

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  error: string | null;
  warning: string | null;
  status: string | null;
}

export function Editor({ code, onChange, error, warning, status }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab inserts 2 spaces instead of moving focus
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newValue = code.slice(0, start) + "  " + code.slice(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
    },
    [code, onChange],
  );

  const statusClass = error ? "error" : warning ? "warning" : status ? "success" : "";

  return (
    <div className="editor-section">
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder={`flowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[OK]\n    B -->|No| D[Not OK]`}
      />
      {(error || warning || status) && (
        <div className={`status-bar ${statusClass}`}>
          {error && (
            <>
              <strong>Parse Error</strong>
              <pre>{error}</pre>
            </>
          )}
          {warning && !error && (
            <>
              <strong>Not Supported</strong> — {warning}
            </>
          )}
          {status && !error && !warning && status}
        </div>
      )}
    </div>
  );
}
