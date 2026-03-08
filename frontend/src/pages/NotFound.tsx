import { Link } from "react-router-dom";
import { ui } from "@/lib/ui";

export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-8">
      <div className={`${ui.card} ${ui.centerNarrow} space-y-4`}>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Drawhaus</p>
          <h1 className={ui.h1}>Page not found</h1>
          <p className={ui.subtitle}>The page you are looking for does not exist or was moved.</p>
        </div>
        <div className="flex gap-3">
          <Link className={`${ui.btn} ${ui.btnPrimary}`} to="/dashboard">Dashboard</Link>
          <Link className={`${ui.btn} ${ui.btnSecondary}`} to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
