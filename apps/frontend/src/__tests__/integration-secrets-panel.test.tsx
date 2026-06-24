import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { toastFn } = vi.hoisted(() => ({ toastFn: vi.fn() }));

vi.mock("@/components/Toast", () => ({ useToast: () => toastFn }));

vi.mock("@/api/admin", () => ({
  adminApi: {
    getIntegrations: vi.fn(),
    updateIntegration: vi.fn(),
  },
}));

import { adminApi } from "@/api/admin";
import { IntegrationSecretsPanel } from "@/components/IntegrationSecretsPanel";

type IntegrationFixture = {
  key: string;
  source: "db" | "env" | "none";
  maskedValue: string;
};

const baseIntegrations: IntegrationFixture[] = [
  { key: "GOOGLE_CLIENT_ID", source: "db", maskedValue: "abc***xyz" },
  { key: "GOOGLE_CLIENT_SECRET", source: "env", maskedValue: "(from env)" },
  { key: "GOOGLE_REDIRECT_URI", source: "none", maskedValue: "" },
  { key: "RESEND_API_KEY", source: "db", maskedValue: "re_***" },
  { key: "FROM_EMAIL", source: "env", maskedValue: "(from env)" },
];

function mockGetIntegrations(items: IntegrationFixture[], encryptionEnabled = true) {
  vi.mocked(adminApi.getIntegrations).mockResolvedValue({
    integrations: items,
    encryptionEnabled,
  });
}

describe("IntegrationSecretsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows loading state then renders integrations", async () => {
    mockGetIntegrations(baseIntegrations);
    render(<IntegrationSecretsPanel />);
    expect(screen.getByText(/Loading integrations/i)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(/Loading integrations/i)).toBeNull());
    expect(screen.getAllByText("Client ID").length).toBeGreaterThan(0);
    expect(screen.getByText("Email (Resend)")).toBeTruthy();
  });

  test("renders the warning when ENCRYPTION_KEY is disabled", async () => {
    mockGetIntegrations([], false);
    render(<IntegrationSecretsPanel />);
    await waitFor(() => expect(screen.queryByText(/Loading integrations/i)).toBeNull());
    expect(screen.getAllByText(/ENCRYPTION_KEY/).length).toBeGreaterThan(0);
    expect(screen.getByText(/can only be configured via environment variables/i)).toBeTruthy();
  });

  test("groups integrations by their LABELS group", async () => {
    mockGetIntegrations(baseIntegrations);
    render(<IntegrationSecretsPanel />);
    await waitFor(() => expect(screen.getByText("Google OAuth")).toBeTruthy());
    expect(screen.getByText("Email (Resend)")).toBeTruthy();
  });

  test("renders source badge labels (DB / ENV / Not set)", async () => {
    mockGetIntegrations(baseIntegrations);
    render(<IntegrationSecretsPanel />);
    await waitFor(() => expect(screen.queryByText(/Loading integrations/i)).toBeNull());
    expect(screen.getAllByText("DB").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ENV").length).toBeGreaterThan(0);
    expect(screen.getByText("Not set")).toBeTruthy();
  });

  test("clicking Edit reveals the input and Save/Cancel buttons", async () => {
    mockGetIntegrations(baseIntegrations);
    const user = userEvent.setup();
    render(<IntegrationSecretsPanel />);
    await waitFor(() => expect(screen.queryByText(/Loading integrations/i)).toBeNull());
    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    await user.click(editButtons[0]);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  test("Save is disabled while input is empty", async () => {
    mockGetIntegrations(baseIntegrations);
    const user = userEvent.setup();
    render(<IntegrationSecretsPanel />);
    await waitFor(() => expect(screen.queryByText(/Loading integrations/i)).toBeNull());
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    const saveBtn = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  test("Cancel resets editing state", async () => {
    mockGetIntegrations(baseIntegrations);
    const user = userEvent.setup();
    render(<IntegrationSecretsPanel />);
    await waitFor(() => expect(screen.queryByText(/Loading integrations/i)).toBeNull());
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  test("typing a value enables Save and persists on click", async () => {
    mockGetIntegrations(baseIntegrations);
    vi.mocked(adminApi.updateIntegration).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    render(<IntegrationSecretsPanel />);
    await waitFor(() => expect(screen.queryByText(/Loading integrations/i)).toBeNull());

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    const input = screen.getByPlaceholderText(/Enter Client ID/i);
    await user.type(input, "new-secret-value");
    const saveBtn = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    await user.click(saveBtn);

    await waitFor(() => {
      expect(adminApi.updateIntegration).toHaveBeenCalledWith("GOOGLE_CLIENT_ID", "new-secret-value");
    });
    expect(toastFn).toHaveBeenCalledWith("Integration secret updated", "success");
  });

  test("save error path toasts an error", async () => {
    mockGetIntegrations(baseIntegrations);
    vi.mocked(adminApi.updateIntegration).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<IntegrationSecretsPanel />);
    await waitFor(() => expect(screen.queryByText(/Loading integrations/i)).toBeNull());

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.type(screen.getByPlaceholderText(/Enter Client ID/i), "anything");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(toastFn).toHaveBeenCalledWith("Failed to update secret", "error");
    });
  });

  test("Clear button only renders for DB-sourced secrets and calls update with empty string", async () => {
    mockGetIntegrations(baseIntegrations);
    vi.mocked(adminApi.updateIntegration).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    render(<IntegrationSecretsPanel />);
    await waitFor(() => expect(screen.queryByText(/Loading integrations/i)).toBeNull());

    const clearButtons = screen.getAllByRole("button", { name: "Clear" });
    // 2 db-sourced fixtures
    expect(clearButtons.length).toBe(2);

    await user.click(clearButtons[0]);
    await waitFor(() => {
      expect(adminApi.updateIntegration).toHaveBeenCalledWith("GOOGLE_CLIENT_ID", "");
    });
    expect(toastFn).toHaveBeenCalledWith("Secret cleared", "success");
  });

  test("clear error path toasts an error", async () => {
    mockGetIntegrations(baseIntegrations);
    vi.mocked(adminApi.updateIntegration).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<IntegrationSecretsPanel />);
    await waitFor(() => expect(screen.queryByText(/Loading integrations/i)).toBeNull());

    await user.click(screen.getAllByRole("button", { name: "Clear" })[0]);
    await waitFor(() => {
      expect(toastFn).toHaveBeenCalledWith("Failed to clear secret", "error");
    });
  });

  test("getIntegrations failure leaves loading=false with empty list", async () => {
    vi.mocked(adminApi.getIntegrations).mockRejectedValue(new Error("boom"));
    await act(async () => {
      render(<IntegrationSecretsPanel />);
    });
    await waitFor(() => expect(screen.queryByText(/Loading integrations/i)).toBeNull());
    // encryptionEnabled defaults to false in error path -> warning shows
    expect(screen.getAllByText(/ENCRYPTION_KEY/).length).toBeGreaterThan(0);
  });
});
