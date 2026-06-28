import { describe, test, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./_helpers/render";
import { Setup } from "../pages/Setup";
import { WorkspaceInvite } from "../pages/WorkspaceInvite";

vi.mock("@/api/auth", () => ({
  authApi: { getMe: vi.fn().mockRejectedValue(new Error("no session")) },
}));

vi.mock("@/api/setup", () => ({
  setupApi: {
    getStatus: vi.fn().mockResolvedValue({ setupCompleted: false, step: 1 }),
    complete: vi.fn(),
  },
}));

vi.mock("@/api/workspaces", () => ({
  workspacesApi: {
    resolveInvite: vi.fn().mockResolvedValue({ workspaceName: "Acme", role: "member" }),
    acceptInvite: vi.fn(),
    list: vi.fn().mockResolvedValue({ workspaces: [] }),
  },
}));

describe("misc pages — smoke (render without crashing)", () => {
  test("Setup renders once status loads", async () => {
    renderWithProviders(<Setup />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /setup/i })).toBeTruthy());
  });

  test("WorkspaceInvite renders the invitation once it resolves", async () => {
    renderWithProviders(<WorkspaceInvite />, { route: "/invite/tok123", path: "/invite/:token" });
    await waitFor(() => expect(screen.getByRole("heading", { name: /workspace invitation/i })).toBeTruthy());
  });
});
