import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { siteApi } from "@/api/admin";
import { MaintenancePage } from "@/pages/MaintenancePage";

export function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);

  useEffect(() => {
    siteApi.getStatus()
      .then((data) => setMaintenance(data.maintenanceMode))
      .catch(() => {})
      .finally(() => setStatusLoaded(true));
  }, []);

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

  return <Outlet />;
}
