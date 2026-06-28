import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "./_helpers/render";
import { AppShell } from "../layouts/AppShell";
import { AuthLayout } from "../layouts/AuthLayout";
import { ProtectedLayout } from "../layouts/ProtectedLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { authApi } from "@/api/auth";

vi.mock("@/api/auth", () => ({
  authApi: { getMe: vi.fn(), getSetupStatus: vi.fn().mockResolvedValue({ needsSetup: false }) },
}));
vi.mock("@/api/admin", () => ({
  siteApi: { getStatus: vi.fn().mockResolvedValue({ maintenanceMode: false }) },
  adminApi: {},
}));
vi.mock("@/api/setup", () => ({
  setupApi: { getStatus: vi.fn().mockResolvedValue({ setupCompleted: true, setupSkippedIntegrations: false }) },
}));

const getMe = vi.mocked(authApi.getMe);
const asUser = (role: string) => ({ id: "u1", name: "U", email: "u@x.com", role });

beforeEach(() => getMe.mockReset());

function gate(layout: React.ReactElement, protectedPath: string, target: { path: string; label: string }) {
  return (
    <Routes>
      <Route element={layout}>
        <Route path={protectedPath} element={<div>OUTLET CONTENT</div>} />
      </Route>
      <Route path={target.path} element={<div>{target.label}</div>} />
    </Routes>
  );
}

describe("layouts — behaviour smoke", () => {
  test("AppShell renders its Outlet", async () => {
    getMe.mockResolvedValue(null);
    renderWithProviders(gate(<AppShell />, "/x", { path: "/login", label: "LOGIN" }), { route: "/x" });
    await waitFor(() => expect(screen.getByText("OUTLET CONTENT")).toBeTruthy());
  });

  test("AuthLayout shows the Outlet when logged out", async () => {
    getMe.mockResolvedValue(null);
    renderWithProviders(gate(<AuthLayout />, "/login-area", { path: "/dashboard", label: "DASHBOARD" }), { route: "/login-area" });
    await waitFor(() => expect(screen.getByText("OUTLET CONTENT")).toBeTruthy());
  });

  test("AuthLayout redirects to dashboard when logged in", async () => {
    getMe.mockResolvedValue(asUser("user"));
    renderWithProviders(gate(<AuthLayout />, "/login-area", { path: "/dashboard", label: "DASHBOARD" }), { route: "/login-area" });
    await waitFor(() => expect(screen.getByText("DASHBOARD")).toBeTruthy());
  });

  test("ProtectedLayout redirects to login when logged out", async () => {
    getMe.mockResolvedValue(null);
    renderWithProviders(gate(<ProtectedLayout />, "/protected", { path: "/login", label: "LOGIN" }), { route: "/protected" });
    await waitFor(() => expect(screen.getByText("LOGIN")).toBeTruthy());
  });

  test("ProtectedLayout renders the Outlet when logged in", async () => {
    getMe.mockResolvedValue(asUser("user"));
    renderWithProviders(gate(<ProtectedLayout />, "/protected", { path: "/login", label: "LOGIN" }), { route: "/protected" });
    await waitFor(() => expect(screen.getByText("OUTLET CONTENT")).toBeTruthy());
  });

  // AdminLayout has no loading guard, so it redirects on first render before auth
  // resolves — only the non-admin redirect is deterministically testable. (It is also
  // legacy: not wired into AppRouter, which routes admin via Settings tabs.)
  test("AdminLayout redirects non-admins to dashboard", async () => {
    getMe.mockResolvedValue(asUser("user"));
    renderWithProviders(gate(<AdminLayout />, "/admin-area", { path: "/dashboard", label: "DASHBOARD" }), { route: "/admin-area" });
    await waitFor(() => expect(screen.getByText("DASHBOARD")).toBeTruthy());
  });
});
