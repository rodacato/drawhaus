import { Routes, Route, Navigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { AppShell } from "@/layouts/AppShell";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { Board } from "@/pages/Board";
import { Settings } from "@/pages/Settings";
import { Setup } from "@/pages/Setup";
import { Share } from "@/pages/Share";
import { Embed } from "@/pages/Embed";
import { LandingPage } from "@/pages/LandingPage";
import { NotFound } from "@/pages/NotFound";

export function AppRouter() {
  return (
    <Routes>
      {/* Auth routes - redirect to dashboard if already logged in */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Public landing page — redirects to dashboard if authenticated */}
      <Route path="/" element={<LandingPage />} />

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
      <Route path="/admin/users" element={<Navigate to="/settings?tab=admin-users" replace />} />
      <Route path="/admin/settings" element={<Navigate to="/settings?tab=admin-site" replace />} />
      <Route path="/admin/style-guide" element={<Navigate to="/settings?tab=admin-style" replace />} />

      {/* Public routes */}
      <Route path="/setup" element={<Setup />} />
      <Route path="/share/:token" element={<Share />} />
      <Route path="/embed/:token" element={<Embed />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
