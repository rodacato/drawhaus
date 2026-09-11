import { Link } from "react-router-dom";
import type { FallbackProps } from "react-error-boundary";
import { ui } from "@/lib/ui";

export function AppErrorFallback({ error, resetErrorBoundary }: Readonly<FallbackProps>) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-8">
      <div className={`${ui.card} ${ui.centerNarrow} space-y-4`}>
        <div className="space-y-2 text-center">
          <img src="/logo-icon.svg" alt="Drawhaus" className="mx-auto h-10 w-10" />
          <h1 className={ui.h1}>Something went wrong</h1>
          <p className={ui.subtitle}>This page crashed. Try again, or go back to the dashboard.</p>
        </div>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-surface px-3 py-2 text-xs text-red-600">
          {message}
        </pre>
        <div className="flex gap-3">
          <button
            type="button"
            className={`${ui.btn} ${ui.btnPrimary}`}
            onClick={resetErrorBoundary}
          >
            Try again
          </button>
          <Link className={`${ui.btn} ${ui.btnSecondary}`} to="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
