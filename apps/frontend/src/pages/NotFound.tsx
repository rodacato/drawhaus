import { Link } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";
import { ui } from "@/lib/ui";
import { BrandLogo } from "@/components/BrandLogo";

export function NotFound() {
  return (
    <AuthShell>
      <div className="space-y-2 text-center">
        <BrandLogo alt="Drawhaus" className="mx-auto h-10 w-10" />
        <h1 className={ui.h1}>Page not found</h1>
        <p className={ui.subtitle}>The page you are looking for does not exist or was moved.</p>
      </div>
      <div className="flex gap-3">
        <Link className={`${ui.btn} ${ui.btnPrimary}`} to="/dashboard">
          Dashboard
        </Link>
        <Link className={`${ui.btn} ${ui.btnSecondary}`} to="/login">
          Login
        </Link>
      </div>
    </AuthShell>
  );
}
