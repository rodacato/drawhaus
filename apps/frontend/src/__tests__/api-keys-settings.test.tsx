import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/api/api-keys", () => ({
  apiKeysApi: {
    list: vi.fn(),
    create: vi.fn(),
    revoke: vi.fn(),
  },
}));

vi.mock("@/api/workspaces", () => ({
  workspacesApi: {
    list: vi.fn(),
  },
}));

import { apiKeysApi, type ApiKeyResponse } from "@/api/api-keys";
import { workspacesApi } from "@/api/workspaces";
import { ApiKeysSettings } from "@/components/ApiKeysSettings";

const workspaces = [
  { id: "ws-1", name: "Personal", description: "", ownerId: "u1", isPersonal: true, color: "#000", icon: "", createdAt: "", updatedAt: "" },
  { id: "ws-2", name: "Team", description: "", ownerId: "u1", isPersonal: false, color: "#fff", icon: "", createdAt: "", updatedAt: "" },
];

function mockWorkspaces() {
  vi.mocked(workspacesApi.list).mockResolvedValue({ workspaces });
}

function getCreateSubmit(): HTMLButtonElement {
  // The submit button lives inside the modal form. The trigger button is outside any form.
  const buttons = screen.getAllByRole("button", { name: /Create key|Creating/ });
  const submit = buttons.find((b) => (b as HTMLButtonElement).form !== null);
  if (!submit) throw new Error("submit button not found");
  return submit as HTMLButtonElement;
}

function makeKey(overrides: Partial<ApiKeyResponse> = {}): ApiKeyResponse {
  return {
    id: "k1",
    name: "CI",
    workspaceId: "ws-1",
    keyPrefix: "dh_abc",
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const clipboardWrite = vi.fn().mockResolvedValue(undefined);

// jsdom does not implement navigator.clipboard. Install a stable stub once.
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: { writeText: clipboardWrite },
});

describe("ApiKeysSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clipboardWrite.mockClear();
  });

  test("shows loading then empty state when no keys exist", async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue({ keys: [] });
    mockWorkspaces();
    render(<ApiKeysSettings />);
    expect(screen.getByText(/Loading/)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(/^Loading\.\.\.$/)).toBeNull());
    expect(screen.getByText("No API keys yet")).toBeTruthy();
  });

  test("renders a table row per key with status labels", async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue({
      keys: [
        makeKey({ id: "a", name: "Active key" }),
        makeKey({ id: "b", name: "Revoked key", revokedAt: "2024-01-02T00:00:00.000Z" }),
        makeKey({ id: "c", name: "Expired key", expiresAt: "2000-01-01T00:00:00.000Z" }),
      ],
    });
    mockWorkspaces();
    render(<ApiKeysSettings />);
    await waitFor(() => expect(screen.getByText("Active key")).toBeTruthy());
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("Revoked")).toBeTruthy();
    expect(screen.getByText("Expired")).toBeTruthy();
  });

  test("workspaceName falls back to 'Unknown' when workspace is missing", async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue({
      keys: [makeKey({ workspaceId: "missing-ws" })],
    });
    mockWorkspaces();
    render(<ApiKeysSettings />);
    await waitFor(() => expect(screen.getByText("Unknown")).toBeTruthy());
  });

  test("clicking 'Create key' opens the form", async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue({ keys: [] });
    mockWorkspaces();
    const user = userEvent.setup();
    render(<ApiKeysSettings />);
    await waitFor(() => expect(screen.queryByText(/^Loading\.\.\.$/)).toBeNull());
    // Trigger button is the only "Create key" before modal opens.
    await user.click(screen.getByRole("button", { name: "Create key" }));
    expect(screen.getByText("New API Key")).toBeTruthy();
    expect(screen.getByPlaceholderText(/e\.g\. MCP Server/)).toBeTruthy();
  });

  test("submit button is disabled with empty name", async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue({ keys: [] });
    mockWorkspaces();
    const user = userEvent.setup();
    render(<ApiKeysSettings />);
    await waitFor(() => expect(screen.queryByText(/^Loading\.\.\.$/)).toBeNull());
    await user.click(screen.getAllByRole("button", { name: "Create key" })[0]);
    expect(getCreateSubmit().disabled).toBe(true);
  });

  test("creating a key shows the one-time plain key", async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue({ keys: [] });
    mockWorkspaces();
    vi.mocked(apiKeysApi.create).mockResolvedValue({
      key: makeKey({ id: "new", name: "My key" }),
      plainKey: "dh_SECRET_PLAIN_TEXT",
    });

    const user = userEvent.setup();
    render(<ApiKeysSettings />);
    await waitFor(() => expect(screen.queryByText(/^Loading\.\.\.$/)).toBeNull());
    await user.click(screen.getByRole("button", { name: "Create key" }));
    await user.type(screen.getByPlaceholderText(/e\.g\. MCP Server/), "My key");

    await user.click(getCreateSubmit());

    await waitFor(() => expect(screen.getByText("dh_SECRET_PLAIN_TEXT")).toBeTruthy());
    expect(apiKeysApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "My key", workspaceId: "ws-1" }),
    );
  });

  test("clicking Copy writes plain key to clipboard and toggles the label", async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue({ keys: [] });
    mockWorkspaces();
    vi.mocked(apiKeysApi.create).mockResolvedValue({
      key: makeKey({ id: "new", name: "X" }),
      plainKey: "dh_PLAINTEXT",
    });

    const user = userEvent.setup();
    // userEvent.setup() installs its own clipboard mock. Re-install ours afterward.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWrite },
    });

    render(<ApiKeysSettings />);
    await waitFor(() => expect(screen.queryByText(/^Loading\.\.\.$/)).toBeNull());
    await user.click(screen.getByRole("button", { name: "Create key" }));
    await user.type(screen.getByPlaceholderText(/e\.g\. MCP Server/), "X");
    await user.click(getCreateSubmit());

    const copyBtn = await screen.findByRole("button", { name: "Copy" });
    await user.click(copyBtn);
    expect(clipboardWrite).toHaveBeenCalledWith("dh_PLAINTEXT");
    expect(await screen.findByRole("button", { name: "Copied!" })).toBeTruthy();
  });

  test("create error surfaces the API error message", async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue({ keys: [] });
    mockWorkspaces();
    vi.mocked(apiKeysApi.create).mockRejectedValue({
      response: { data: { error: "Name already taken" } },
    });

    const user = userEvent.setup();
    render(<ApiKeysSettings />);
    await waitFor(() => expect(screen.queryByText(/^Loading\.\.\.$/)).toBeNull());
    await user.click(screen.getByRole("button", { name: "Create key" }));
    await user.type(screen.getByPlaceholderText(/e\.g\. MCP Server/), "Dup");
    await user.click(getCreateSubmit());

    await waitFor(() => expect(screen.getByText("Name already taken")).toBeTruthy());
  });

  test("create error fallback message when no response detail", async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue({ keys: [] });
    mockWorkspaces();
    vi.mocked(apiKeysApi.create).mockRejectedValue(new Error("nope"));

    const user = userEvent.setup();
    render(<ApiKeysSettings />);
    await waitFor(() => expect(screen.queryByText(/^Loading\.\.\.$/)).toBeNull());
    await user.click(screen.getByRole("button", { name: "Create key" }));
    await user.type(screen.getByPlaceholderText(/e\.g\. MCP Server/), "Z");
    await user.click(getCreateSubmit());

    await waitFor(() => expect(screen.getByText("Failed to create key")).toBeTruthy());
  });

  test("Cancel closes the form without creating", async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue({ keys: [] });
    mockWorkspaces();
    const user = userEvent.setup();
    render(<ApiKeysSettings />);
    await waitFor(() => expect(screen.queryByText(/^Loading\.\.\.$/)).toBeNull());
    await user.click(screen.getByRole("button", { name: "Create key" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("New API Key")).toBeNull();
    expect(apiKeysApi.create).not.toHaveBeenCalled();
  });

  test("Revoke calls API and refreshes the list", async () => {
    const calls: ApiKeyResponse[][] = [
      [makeKey({ id: "k1", name: "K1" })],
      [makeKey({ id: "k1", name: "K1", revokedAt: "2024-02-02T00:00:00.000Z" })],
    ];
    vi.mocked(apiKeysApi.list).mockImplementation(() => Promise.resolve({ keys: calls.shift() ?? [] }));
    mockWorkspaces();
    vi.mocked(apiKeysApi.revoke).mockResolvedValue(undefined as never);

    const user = userEvent.setup();
    render(<ApiKeysSettings />);
    await waitFor(() => expect(screen.getByText("Active")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(apiKeysApi.revoke).toHaveBeenCalledWith("k1"));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Revoke" })).toBeNull());
  });

  test("Revoke error surfaces a banner error", async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue({ keys: [makeKey()] });
    mockWorkspaces();
    vi.mocked(apiKeysApi.revoke).mockRejectedValue(new Error("nope"));

    const user = userEvent.setup();
    render(<ApiKeysSettings />);
    await waitFor(() => expect(screen.getByText("Active")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(screen.getByText("Failed to revoke key")).toBeTruthy());
  });

  test("list failure sets the error banner", async () => {
    vi.mocked(apiKeysApi.list).mockRejectedValue(new Error("oh no"));
    mockWorkspaces();
    await act(async () => {
      render(<ApiKeysSettings />);
    });
    await waitFor(() => expect(screen.getByText("Failed to load API keys")).toBeTruthy());
  });
});
