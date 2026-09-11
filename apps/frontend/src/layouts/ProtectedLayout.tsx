import { useEffect, useState } from "react";
import { Navigate, Outlet, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { siteApi } from "@/api/admin";
import { setupApi } from "@/api/setup";
import { onUnauthorized } from "@/api/client";
import { MaintenancePage } from "@/pages/MaintenancePage";
import { PageLoading } from "@/components/PageLoading";

export function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [showSetupBanner, setShowSetupBanner] = useState(false);

  // A full reload rather than <Navigate>: after a mid-session expiry the user in context is stale.
  useEffect(
    () =>
      onUnauthorized(() => {
        globalThis.location.href = "/login";
      }),
    [],
  );

  useEffect(() => {
    siteApi
      .getStatus()
      .then((data) => setMaintenance(data.maintenanceMode))
      .catch(() => {})
      .finally(() => setStatusLoaded(true));
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      setupApi
        .getStatus()
        .then((status) =>
          setShowSetupBanner(status.setupSkippedIntegrations === true && status.setupCompleted),
        )
        .catch(() => {});
    }
  }, [user]);

  if (loading || !statusLoaded) {
    return <PageLoading />;
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
