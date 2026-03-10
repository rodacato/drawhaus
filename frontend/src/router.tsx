import { Routes, Route, Navigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AppShell } from "@/layouts/AppShell";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { Board } from "@/pages/Board";
import { Settings } from "@/pages/Settings";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AdminUsers } from "@/pages/AdminUsers";
import { AdminSettings } from "@/pages/AdminSettings";
import { AdminStyleGuide } from "@/pages/AdminStyleGuide";
import { Setup } from "@/pages/Setup";
import { Share } from "@/pages/Share";
import { Embed } from "@/pages/Embed";
import { NotFound } from "@/pages/NotFound";

export function AppRouter() {
  return (
    <Routes>
      {/* Auth routes - redirect to dashboard if already logged in */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected routes - redirect to login if not authenticated */}
      <Route element={<ProtectedLayout />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/style-guide" element={<AdminStyleGuide />} />
          </Route>
        </Route>
        {/* Board is full-screen, no AppShell */}
        <Route path="/board/:id" element={<Board />} />
      </Route>

      {/* Public routes */}
      <Route path="/setup" element={<Setup />} />
      <Route path="/share/:token" element={<Share />} />
      <Route path="/embed/:token" element={<Embed />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
