import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const { authState, themeState, navigateFn, refreshUserFn, logoutFn } = vi.hoisted(() => ({
  authState: {
    user: {
      id: "user-1",
      email: "me@example.com",
      name: "Me",
      role: "user",
      avatarUrl: null,
      hasPassword: true,
      linkedProviders: [] as string[],
      githubUsername: null as string | null,
    } as null | {
      id: string;
      email: string;
      name: string;
      role: string;
      avatarUrl: string | null;
      hasPassword: boolean;
      linkedProviders: string[];
      githubUsername: string | null;
    },
  },
  themeState: { theme: "light" as "light" | "dark", setTheme: vi.fn() },
  navigateFn: vi.fn(),
  refreshUserFn: vi.fn(),
  logoutFn: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateFn,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    refreshUser: refreshUserFn,
    logout: logoutFn,
  }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: themeState.theme,
    setTheme: themeState.setTheme,
    toggleTheme: vi.fn(),
  }),
}));

vi.mock("@/api/auth", () => ({
  authApi: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
    unlinkProvider: vi.fn(),
  },
}));

vi.mock("@/api/workspaces", () => ({
  workspacesApi: {
    listOwnedShared: vi.fn(),
  },
}));

// Lightweight stubs for heavy children — keep test focused on Settings logic.
vi.mock("@/components/DriveIntegrationCard", () => ({
  DriveIntegrationCard: () => <div data-testid="drive-integration-card" />,
}));
vi.mock("@/components/ApiKeysSettings", () => ({
  ApiKeysSettings: () => <div data-testid="api-keys-settings" />,
}));
vi.mock("@/pages/AdminUsers", () => ({ AdminUsers: () => <div data-testid="admin-users" /> }));
vi.mock("@/pages/AdminSettings", () => ({ AdminSettings: () => <div data-testid="admin-settings" /> }));
vi.mock("@/pages/AdminStyleGuide", () => ({ AdminStyleGuide: () => <div data-testid="admin-style" /> }));
vi.mock("@/pages/AdminDashboard", () => ({
  AdminOverview: () => <div data-testid="admin-overview" />,
}));

import { authApi } from "@/api/auth";
import { workspacesApi } from "@/api/workspaces";
import { Settings } from "@/pages/Settings";

function renderSettings(initialEntries: string[] = ["/settings"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Settings />
    </MemoryRouter>,
  );
}

function resetUser(overrides: Partial<NonNullable<typeof authState.user>> = {}) {
  authState.user = {
    id: "user-1",
    email: "me@example.com",
    name: "Me",
    role: "user",
    avatarUrl: null,
    hasPassword: true,
    linkedProviders: [],
    githubUsername: null,
    ...overrides,
  };
}

describe("Settings page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetUser();
    themeState.theme = "light";
  });

  // ---------- Tabs / navigation ----------

  test("renders the Profile tab by default", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: "Profile" })).toBeTruthy();
    expect(screen.getByLabelText("Full Name")).toBeTruthy();
  });

  test("?tab=security opens the Security tab", () => {
    renderSettings(["/settings?tab=security"]);
    expect(screen.getByRole("heading", { name: "Change Password" })).toBeTruthy();
  });

  test("clicking Security switches to that tab", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /Security/ }));
    expect(screen.getByRole("heading", { name: "Change Password" })).toBeTruthy();
  });

  test("Billing tab renders Community Edition copy", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /Billing/ }));
    expect(screen.getByText("Self-Hosted Instance")).toBeTruthy();
    expect(screen.getByText(/Community Edition/)).toBeTruthy();
  });

  test("Integrations tab renders DriveIntegrationCard", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /Integrations/ }));
    expect(screen.getByTestId("drive-integration-card")).toBeTruthy();
  });

  test("API Keys tab renders ApiKeysSettings", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /API Keys/ }));
    expect(screen.getByTestId("api-keys-settings")).toBeTruthy();
  });

  test("Preferences tab renders the theme picker", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /Preferences/ }));
    expect(screen.getByRole("button", { name: /Light/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dark/ })).toBeTruthy();
  });

  test("Preferences: clicking Dark calls setTheme", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /Preferences/ }));
    await user.click(screen.getByRole("button", { name: /Dark/ }));
    expect(themeState.setTheme).toHaveBeenCalledWith("dark");
  });

  test("admin role surfaces the Admin nav section", () => {
    resetUser({ role: "admin" });
    renderSettings();
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Overview/ })).toBeTruthy();
  });

  test("non-admin does NOT see the Admin section", () => {
    renderSettings();
    expect(screen.queryByText("Admin")).toBeNull();
  });

  test("Logout button triggers logout + navigate('/login')", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /Log out/ }));
    await waitFor(() => expect(logoutFn).toHaveBeenCalled());
    expect(navigateFn).toHaveBeenCalledWith("/login");
  });

  // ---------- Profile form ----------

  test("Profile: submit calls updateProfile with trimmed values", async () => {
    vi.mocked(authApi.updateProfile).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderSettings();
    const name = screen.getByLabelText("Full Name") as HTMLInputElement;
    await user.clear(name);
    await user.type(name, "  Adrian  ");
    await user.click(screen.getByRole("button", { name: /Save Profile/ }));
    await waitFor(() =>
      expect(authApi.updateProfile).toHaveBeenCalledWith({ name: "Adrian", email: "me@example.com" }),
    );
    expect(await screen.findByText("Profile updated")).toBeTruthy();
    expect(refreshUserFn).toHaveBeenCalled();
  });

  test("Profile: API error message is surfaced", async () => {
    vi.mocked(authApi.updateProfile).mockRejectedValue({ response: { data: { error: "Email taken" } } });
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /Save Profile/ }));
    expect(await screen.findByText("Email taken")).toBeTruthy();
  });

  test("Profile: generic error falls back to 'Update failed'", async () => {
    vi.mocked(authApi.updateProfile).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /Save Profile/ }));
    expect(await screen.findByText("Update failed")).toBeTruthy();
  });

  // ---------- Password form ----------

  test("Password: mismatched confirm shows 'Passwords do not match'", async () => {
    const user = userEvent.setup();
    renderSettings(["/settings?tab=security"]);
    await user.type(screen.getByLabelText("Current Password"), "current-pw");
    await user.type(screen.getByLabelText("New Password"), "new-password-1");
    await user.type(screen.getByLabelText("Confirm New Password"), "different-pw");
    await user.click(screen.getByRole("button", { name: /Update Password/ }));
    expect(await screen.findByText("Passwords do not match")).toBeTruthy();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  test("Password: happy path calls API and clears the form", async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderSettings(["/settings?tab=security"]);
    await user.type(screen.getByLabelText("Current Password"), "current-pw");
    await user.type(screen.getByLabelText("New Password"), "new-password-1");
    await user.type(screen.getByLabelText("Confirm New Password"), "new-password-1");
    await user.click(screen.getByRole("button", { name: /Update Password/ }));
    await waitFor(() => expect(authApi.changePassword).toHaveBeenCalledWith("current-pw", "new-password-1"));
    expect(await screen.findByText("Password changed")).toBeTruthy();
    expect((screen.getByLabelText("Current Password") as HTMLInputElement).value).toBe("");
  });

  test("Password: Unauthorized => 'Current password is incorrect'", async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue({ response: { data: { error: "Unauthorized" } } });
    const user = userEvent.setup();
    renderSettings(["/settings?tab=security"]);
    await user.type(screen.getByLabelText("Current Password"), "wrong");
    await user.type(screen.getByLabelText("New Password"), "new-password-1");
    await user.type(screen.getByLabelText("Confirm New Password"), "new-password-1");
    await user.click(screen.getByRole("button", { name: /Update Password/ }));
    expect(await screen.findByText("Current password is incorrect")).toBeTruthy();
  });

  // ---------- Connected accounts ----------

  test("Connected: 'Connect' link is shown when provider is not linked", () => {
    renderSettings(["/settings?tab=security"]);
    const connectLinks = screen.getAllByRole("link", { name: /Connect/ });
    expect(connectLinks.length).toBeGreaterThanOrEqual(2); // Google + GitHub
  });

  test("Connected: Disconnect button appears when provider is linked", () => {
    resetUser({ linkedProviders: ["google", "github"] });
    renderSettings(["/settings?tab=security"]);
    const disconnectButtons = screen.getAllByRole("button", { name: /Disconnect/ });
    expect(disconnectButtons.length).toBe(2);
  });

  test("Connected: clicking Disconnect calls unlinkProvider + refresh", async () => {
    resetUser({ linkedProviders: ["google", "github"] });
    vi.mocked(authApi.unlinkProvider).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderSettings(["/settings?tab=security"]);
    const buttons = screen.getAllByRole("button", { name: /Disconnect/ });
    await user.click(buttons[0]); // google
    await waitFor(() => expect(authApi.unlinkProvider).toHaveBeenCalledWith("google"));
    expect(await screen.findByText(/Google account disconnected/)).toBeTruthy();
    expect(refreshUserFn).toHaveBeenCalled();
  });

  test("Connected: Disconnect is disabled when only one sign-in method remains (and password counts)", () => {
    // hasPassword=true, providers=["google"] -> 2 methods; disconnect should be enabled.
    // Force lastMethod: no password, single provider.
    resetUser({ linkedProviders: ["google"], hasPassword: false });
    renderSettings(["/settings?tab=security"]);
    const disconnect = screen.getByRole("button", { name: /Disconnect/ }) as HTMLButtonElement;
    expect(disconnect.disabled).toBe(true);
  });

  test("Connected: ?linked=google query param shows success status and refreshes user", async () => {
    renderSettings(["/settings?tab=security&linked=google"]);
    expect(await screen.findByText(/Google account linked successfully/)).toBeTruthy();
    expect(refreshUserFn).toHaveBeenCalled();
  });

  test("Connected: ?link_error=github surfaces failure status", async () => {
    renderSettings(["/settings?tab=security&link_error=github"]);
    expect(await screen.findByText(/Failed to link GitHub account/)).toBeTruthy();
  });

  test("Connected: Disconnect API error surfaces the message", async () => {
    resetUser({ linkedProviders: ["google", "github"] });
    vi.mocked(authApi.unlinkProvider).mockRejectedValue({
      response: { data: { error: "Cannot disconnect: workspace owner" } },
    });
    const user = userEvent.setup();
    renderSettings(["/settings?tab=security"]);
    await user.click(screen.getAllByRole("button", { name: /Disconnect/ })[0]);
    expect(await screen.findByText("Cannot disconnect: workspace owner")).toBeTruthy();
  });

  // ---------- Delete account ----------

  test("Danger Zone: clicking Delete Account expands the confirm form", async () => {
    const user = userEvent.setup();
    renderSettings(["/settings?tab=security"]);
    await user.click(screen.getByRole("button", { name: "Delete Account" }));
    expect(screen.getByPlaceholderText("Your password")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Permanently Delete" })).toBeTruthy();
  });

  test("Danger Zone: Cancel resets the confirm form", async () => {
    const user = userEvent.setup();
    renderSettings(["/settings?tab=security"]);
    await user.click(screen.getByRole("button", { name: "Delete Account" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByPlaceholderText("Your password")).toBeNull();
  });

  test("Danger Zone: successful delete navigates to /login", async () => {
    vi.mocked(authApi.deleteAccount).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderSettings(["/settings?tab=security"]);
    await user.click(screen.getByRole("button", { name: "Delete Account" }));
    await user.type(screen.getByPlaceholderText("Your password"), "pw");
    await user.click(screen.getByRole("button", { name: "Permanently Delete" }));
    await waitFor(() => expect(authApi.deleteAccount).toHaveBeenCalledWith("pw"));
    expect(navigateFn).toHaveBeenCalledWith("/login");
  });

  test("Danger Zone: 409 conflict surfaces the owned-shared workspaces warning", async () => {
    vi.mocked(authApi.deleteAccount).mockRejectedValue({
      response: { status: 409, data: { error: "Conflict" } },
    });
    vi.mocked(workspacesApi.listOwnedShared).mockResolvedValue({
      workspaces: [
        { id: "ws-a", name: "Team A" },
        { id: "ws-b", name: "Team B" },
      ],
    });
    const user = userEvent.setup();
    renderSettings(["/settings?tab=security"]);
    await user.click(screen.getByRole("button", { name: "Delete Account" }));
    await user.type(screen.getByPlaceholderText("Your password"), "pw");
    await user.click(screen.getByRole("button", { name: "Permanently Delete" }));
    expect(
      await screen.findByText(/You must transfer ownership of your shared workspaces/),
    ).toBeTruthy();
    expect(await screen.findByText("Team A")).toBeTruthy();
    expect(await screen.findByText("Team B")).toBeTruthy();
  });

  test("Danger Zone: 401 Unauthorized => 'Password is incorrect'", async () => {
    vi.mocked(authApi.deleteAccount).mockRejectedValue({
      response: { status: 401, data: { error: "Unauthorized" } },
    });
    const user = userEvent.setup();
    renderSettings(["/settings?tab=security"]);
    await user.click(screen.getByRole("button", { name: "Delete Account" }));
    await user.type(screen.getByPlaceholderText("Your password"), "pw");
    await user.click(screen.getByRole("button", { name: "Permanently Delete" }));
    expect(await screen.findByText("Password is incorrect")).toBeTruthy();
  });
});
