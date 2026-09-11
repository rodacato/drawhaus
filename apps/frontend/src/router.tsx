import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppErrorFallback } from "@/components/AppErrorFallback";
import { PageLoading } from "@/components/PageLoading";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { AppShell } from "@/layouts/AppShell";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { Setup } from "@/pages/Setup";
import { LandingPage } from "@/pages/LandingPage";
import { SelfHostPage } from "@/pages/SelfHostPage";
import { ForgotPassword } from "@/pages/ForgotPassword";
import { ResetPassword } from "@/pages/ResetPassword";
import { Privacy } from "@/pages/Privacy";
import { Terms } from "@/pages/Terms";
import { NotFound } from "@/pages/NotFound";
import { WorkspaceInvite } from "@/pages/WorkspaceInvite";

// Canvas pages pull in Excalidraw and Mermaid; keep them out of the entry chunk.
const Board = lazy(() => import("@/pages/Board").then((m) => ({ default: m.Board })));
const Share = lazy(() => import("@/pages/Share").then((m) => ({ default: m.Share })));
const Embed = lazy(() => import("@/pages/Embed").then((m) => ({ default: m.Embed })));
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));

function InviteRedirect() {
  const { token } = useParams();
  return <Navigate to={`/register?invite=${token}`} replace />;
}

export function AppRouter() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback} resetKeys={[pathname]}>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Auth routes - redirect to dashboard if already logged in */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          </Route>

          {/* Invite link redirect */}
          <Route path="/invite/:token" element={<InviteRedirect />} />

          {/* Public marketing pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/self-host" element={<SelfHostPage />} />

          {/* Protected routes - redirect to login if not authenticated */}
          <Route element={<ProtectedLayout />}>
            {/* Dashboard is full-screen with its own sidebar/header (Stitch layout) */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route element={<AppShell />}>
              <Route path="/settings" element={<Settings />} />
            </Route>
            {/* Board is full-screen, no AppShell */}
            <Route path="/board/:id" element={<Board />} />
          </Route>

          {/* Redirect old admin routes to settings tabs */}
          <Route path="/admin" element={<Navigate to="/settings?tab=admin-overview" replace />} />
          <Route
            path="/admin/users"
            element={<Navigate to="/settings?tab=admin-users" replace />}
          />
          <Route
            path="/admin/settings"
            element={<Navigate to="/settings?tab=admin-site" replace />}
          />
          <Route
            path="/admin/style-guide"
            element={<Navigate to="/settings?tab=admin-style" replace />}
          />

          {/* Workspace invite (works both authenticated and not) */}
          <Route path="/workspace-invite/:token" element={<WorkspaceInvite />} />

          {/* Public routes */}
          <Route path="/setup" element={<Setup />} />
          <Route path="/share/:token" element={<Share />} />
          <Route path="/embed/:token" element={<Embed />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
