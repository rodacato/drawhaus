import type { FallbackProps } from "react-error-boundary";

export function BoardErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "1rem", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ margin: 0 }}>Something went wrong loading the board</h2>
      <pre style={{ fontSize: "0.875rem", color: "#dc2626", maxWidth: "600px", overflow: "auto" }}>{message}</pre>
      <button
        onClick={resetErrorBoundary}
        style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
      >
        Try again
      </button>
    </div>
  );
}
