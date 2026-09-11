import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/api/auth";
import { PageLoading } from "@/components/PageLoading";

export function AuthLayout() {
  const { user, loading } = useAuth();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      authApi
        .getSetupStatus()
        .then(({ needsSetup }) => {
          setNeedsSetup(needsSetup);
        })
        .catch(() => {
          setNeedsSetup(false);
        });
    }
  }, [loading, user]);

  if (loading || (!user && needsSetup === null)) {
    return <PageLoading />;
  }

  if (user) return <Navigate to="/dashboard" replace />;
  if (needsSetup) return <Navigate to="/setup" replace />;

  return <Outlet />;
}
