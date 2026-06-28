import { describe, test, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./_helpers/render";
import { Dashboard } from "../pages/Dashboard";

vi.mock("@/api/auth", () => ({
  authApi: { getMe: vi.fn().mockResolvedValue({ id: "u1", name: "Me", role: "user" }) },
}));
vi.mock("@/api/diagrams", () => ({
  diagramsApi: {
    list: vi.fn().mockResolvedValue({ diagrams: [] }),
    search: vi.fn().mockResolvedValue({ diagrams: [] }),
  },
}));
vi.mock("@/api/folders", () => ({
  foldersApi: { list: vi.fn().mockResolvedValue({ folders: [] }) },
}));
vi.mock("@/api/tags", () => ({
  tagsApi: { list: vi.fn().mockResolvedValue({ tags: [] }) },
}));
vi.mock("@/api/workspaces", () => ({
  workspacesApi: { list: vi.fn().mockResolvedValue({ workspaces: [] }) },
}));

describe("Dashboard — smoke (render without crashing)", () => {
  test("renders the search field", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByPlaceholderText(/search diagrams/i)).toBeTruthy());
  });
});
