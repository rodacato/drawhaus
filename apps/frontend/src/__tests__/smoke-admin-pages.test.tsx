import { describe, test, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./_helpers/render";
import { AdminOverview } from "../pages/AdminDashboard";
import { AdminUsers } from "../pages/AdminUsers";
import { AdminSettings } from "../pages/AdminSettings";

vi.mock("@/api/auth", () => ({
  authApi: { getMe: vi.fn().mockResolvedValue({ id: "u1", name: "Admin", role: "admin" }) },
}));

vi.mock("@/api/admin", () => ({
  adminApi: {
    getMetrics: vi.fn().mockResolvedValue({ metrics: { totalUsers: 0, totalDiagrams: 0, activeSessions: 0 } }),
    listUsers: vi.fn().mockResolvedValue({ users: [] }),
    getSettings: vi.fn().mockResolvedValue({ settings: {} }),
    getIntegrations: vi.fn().mockResolvedValue({ integrations: [] }),
    inviteUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    updateSettings: vi.fn(),
    updateIntegration: vi.fn(),
  },
}));

describe("admin pages — smoke (render without crashing)", () => {
  test("AdminOverview renders its heading", async () => {
    renderWithProviders(<AdminOverview onNavigate={() => {}} />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /admin dashboard/i })).toBeTruthy());
  });

  test("AdminUsers renders its heading", async () => {
    renderWithProviders(<AdminUsers />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /user management/i })).toBeTruthy());
  });

  test("AdminSettings renders once settings load", async () => {
    renderWithProviders(<AdminSettings />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /site settings/i })).toBeTruthy());
  });
});
