import { useEffect, useState } from "react";
import { Navigate, Outlet, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { siteApi } from "@/api/admin";
import { setupApi } from "@/api/setup";
import { MaintenancePage } from "@/pages/MaintenancePage";

export function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [showSetupBanner, setShowSetupBanner] = useState(false);

  useEffect(() => {
    siteApi.getStatus()
      .then((data) => setMaintenance(data.maintenanceMode))
      .catch(() => {})
      .finally(() => setStatusLoaded(true));
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      setupApi.getStatus()
        .then((status) => setShowSetupBanner(status.setupSkippedIntegrations === true && status.setupCompleted))
        .catch(() => {});
    }
  }, [user]);

  if (loading || !statusLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-sm text-text-muted">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (maintenance && user.role !== "admin") {
    return <MaintenancePage />;
  }

  return (
    <>
      {showSetupBanner && (
        <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-sm text-warning">
          Integrations not configured.{" "}
          <Link to="/settings?tab=admin-site" className="underline hover:no-underline">
            Finish setup
          </Link>
        </div>
      )}
      <Outlet />
    </>
  );
}
