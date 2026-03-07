"use client";

import Link from "next/link";
import { ui } from "@/lib/ui";

export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  console.error("ErrorBoundary caught:", error);
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-8">
      <div className={`${ui.card} ${ui.centerNarrow} space-y-4`}>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-danger">
            Drawhaus
          </p>
          <h1 className={ui.h1}>Something went wrong</h1>
          <p className={ui.subtitle}>
            Please refresh the page. If this keeps happening, return to dashboard.
          </p>
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-red-50 p-2 text-xs text-red-800">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          )}
        </div>
        <div className="flex gap-3">
          <Link className={`${ui.btn} ${ui.btnPrimary}`} href="/dashboard">
            Dashboard
          </Link>
          <Link className={`${ui.btn} ${ui.btnSecondary}`} href="/login">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
