import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "./_helpers/render";
import { AdminOverview } from "../pages/AdminDashboard";
import { AdminUsers } from "../pages/AdminUsers";
import { AdminSettings } from "../pages/AdminSettings";
import { adminApi } from "@/api/admin";

vi.mock("@/api/auth", () => ({
  authApi: { getMe: vi.fn().mockResolvedValue({ id: "u1", name: "Admin", role: "admin" }) },
}));

vi.mock("@/api/admin", () => ({
  adminApi: {
    getMetrics: vi.fn(),
    listUsers: vi.fn(),
    getSettings: vi.fn(),
    getIntegrations: vi.fn().mockResolvedValue({ integrations: [], encryptionEnabled: false }),
    listWebhooks: vi.fn().mockResolvedValue({ webhooks: [], events: [], encryptionEnabled: false }),
  },
}));

beforeEach(() => {
  vi.mocked(adminApi.getMetrics).mockReset();
  vi.mocked(adminApi.listUsers).mockReset();
  vi.mocked(adminApi.getSettings).mockReset();
});

describe("admin pages report load failures", () => {
  test("a failed user list is an error with a retry, never 'No users found.'", async () => {
    vi.mocked(adminApi.listUsers).mockRejectedValueOnce(new Error("boom"));
    renderWithProviders(<AdminUsers />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/Could not load the users/);
    expect(screen.queryByText("No users found.")).toBeNull();

    vi.mocked(adminApi.listUsers).mockResolvedValue({ users: [] });
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No users found.")).toBeTruthy();
  });

  test("the user list says it is loading before it says it is empty", () => {
    vi.mocked(adminApi.listUsers).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AdminUsers />);
    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(screen.queryByText("No users found.")).toBeNull();
  });

  test("failed metrics show an error with a retry", async () => {
    vi.mocked(adminApi.getMetrics).mockRejectedValueOnce(new Error("boom"));
    renderWithProviders(<AdminOverview onNavigate={() => {}} />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/Could not load the metrics/);

    vi.mocked(adminApi.getMetrics).mockResolvedValue({
      metrics: { totalUsers: 7, totalDiagrams: 1, activeSessions: 0 },
    });
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("7")).toBeTruthy();
  });

  test("failed site settings do not stay on 'Loading...' forever", async () => {
    vi.mocked(adminApi.getSettings).mockRejectedValueOnce(new Error("boom"));
    renderWithProviders(<AdminSettings />);
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /Could not load the site settings/,
    );
    expect(screen.queryByText("Loading...")).toBeNull();

    vi.mocked(adminApi.getSettings).mockResolvedValue({ settings: { instanceName: "Drawhaus" } });
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByDisplayValue("Drawhaus")).toBeTruthy();
  });
});
