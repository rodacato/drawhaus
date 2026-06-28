import { describe, test, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminOverview } from "../pages/AdminDashboard";

vi.mock("@/api/admin", () => ({
  adminApi: { getMetrics: vi.fn().mockResolvedValue({ metrics: {} }) },
}));

describe("AdminOverview metric cards", () => {
  test("renders 0 for missing metric values instead of crashing", async () => {
    render(<AdminOverview onNavigate={() => {}} />);
    await waitFor(() => expect(screen.getAllByText("0").length).toBeGreaterThan(0));
  });
});
