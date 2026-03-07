"use client";

import Link from "next/link";
import { ui } from "@/lib/ui";

export default function ErrorPage() {
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
