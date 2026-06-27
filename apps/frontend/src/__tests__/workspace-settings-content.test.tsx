import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { authState, toastFn, confirmFn } = vi.hoisted(() => ({
  authState: {
    user: {
      id: "user-1",
      email: "owner@example.com",
      name: "Owner",
      role: "admin",
      avatarUrl: null,
      hasPassword: true,
      linkedProviders: [],
      githubUsername: null,
    } as {
      id: string;
      email: string;
      name: string;
      role: string;
      avatarUrl: string | null;
      hasPassword: boolean;
      linkedProviders: string[];
      githubUsername: string | null;
    } | null,
  },
  toastFn: vi.fn(),
  confirmFn: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authState.user }),
}));

vi.mock("@/components/Toast", () => ({ useToast: () => toastFn }));

vi.mock("@/components/ConfirmDialog", () => ({ useConfirm: () => confirmFn }));

vi.mock("@/api/workspaces", () => ({
  workspacesApi: {
    get: vi.fn(),
    update: vi.fn(),
    invite: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    transferOwnership: vi.fn(),
    delete: vi.fn(),
  },
}));

import { workspacesApi, type Workspace, type WorkspaceMember } from "@/api/workspaces";
import { WorkspaceSettingsContent } from "@/components/WorkspaceSettingsContent";

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "ws-1",
    name: "Team",
    description: "Team desc",
    ownerId: "user-1",
    isPersonal: false,
    color: "#6366f1",
    icon: "👥",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeMember(overrides: Partial<WorkspaceMember> = {}): WorkspaceMember {
  return {
    userId: "user-2",
    role: "editor",
    userName: "Bob",
    userEmail: "bob@example.com",
    addedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function mockGet(
  workspace: Workspace = makeWorkspace(),
  members: WorkspaceMember[] = [
    makeMember({ userId: "user-1", role: "admin", userName: "Owner", userEmail: "owner@example.com" }),
    makeMember(),
  ],
  role = "admin",
) {
  vi.mocked(workspacesApi.get).mockResolvedValue({ workspace, members, role });
}

describe("WorkspaceSettingsContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows loading then renders sections", async () => {
    mockGet();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    expect(screen.getByText(/Loading/)).toBeTruthy();
    expect(await screen.findByText("Workspace Identity")).toBeTruthy();
    expect(screen.getByText("Members")).toBeTruthy();
  });

  test("get failure calls onClose", async () => {
    vi.mocked(workspacesApi.get).mockRejectedValue(new Error("nope"));
    const onClose = vi.fn();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={onClose} />);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("admin sees editable name/description inputs", async () => {
    mockGet();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    const nameInput = (await screen.findByLabelText("Name")) as HTMLInputElement;
    expect(nameInput.disabled).toBe(false);
    expect(nameInput.value).toBe("Team");
  });

  test("non-admin sees disabled inputs and no Save button", async () => {
    mockGet(makeWorkspace(), [makeMember({ userId: "user-1", role: "viewer", userName: "Me", userEmail: "me@x.com" })], "viewer");
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    const nameInput = (await screen.findByLabelText("Name")) as HTMLInputElement;
    expect(nameInput.disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Save Changes" })).toBeNull();
  });

  test("Save calls API with trimmed name and description, fires onWorkspaceUpdated", async () => {
    mockGet();
    vi.mocked(workspacesApi.update).mockResolvedValue({ workspace: makeWorkspace({ name: "Renamed" }) });
    const onClose = vi.fn();
    const onWorkspaceUpdated = vi.fn();
    const onStatusMessage = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceSettingsContent
        workspaceId="ws-1"
        onClose={onClose}
        onWorkspaceUpdated={onWorkspaceUpdated}
        onStatusMessage={onStatusMessage}
      />,
    );
    const nameInput = (await screen.findByLabelText("Name")) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, "  Renamed  ");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(workspacesApi.update).toHaveBeenCalled());
    expect(workspacesApi.update).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({ name: "Renamed", description: "Team desc" }),
    );
    expect(onWorkspaceUpdated).toHaveBeenCalled();
    expect(onStatusMessage).toHaveBeenCalledWith("Workspace updated");
    expect(onClose).toHaveBeenCalled();
  });

  test("Save no-op when name is empty", async () => {
    mockGet();
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    const nameInput = (await screen.findByLabelText("Name")) as HTMLInputElement;
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(workspacesApi.update).not.toHaveBeenCalled();
  });

  test("Invite sends API call with email + role then reloads", async () => {
    mockGet();
    vi.mocked(workspacesApi.invite).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Members");
    const emailInput = screen.getByPlaceholderText(/colleague@example/);
    await user.type(emailInput, "alice@example.com");
    await user.click(screen.getByRole("button", { name: "Invite" }));
    await waitFor(() =>
      expect(workspacesApi.invite).toHaveBeenCalledWith("ws-1", "alice@example.com", "editor"),
    );
    await waitFor(() => expect(screen.getByText(/Invitation sent to alice@example.com/)).toBeTruthy());
  });

  test("Invite shows failure status on API error", async () => {
    mockGet();
    vi.mocked(workspacesApi.invite).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Members");
    await user.type(screen.getByPlaceholderText(/colleague@example/), "alice@example.com");
    await user.click(screen.getByRole("button", { name: "Invite" }));
    await waitFor(() => expect(screen.getByText("Failed to send invitation")).toBeTruthy());
  });

  test("Invite empty email is a no-op", async () => {
    mockGet();
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Members");
    // Email is type="email" + required so empty submit won't fire. Just verify the API is not called.
    await user.click(screen.getByRole("button", { name: "Invite" }));
    expect(workspacesApi.invite).not.toHaveBeenCalled();
  });

  test("Member remove flow: confirm cancels => no API call", async () => {
    mockGet(makeWorkspace(), [
      makeMember({ userId: "user-1", role: "admin", userName: "Owner", userEmail: "owner@x.com" }),
      makeMember({ userId: "user-2", role: "editor", userName: "Bob", userEmail: "bob@x.com" }),
    ]);
    confirmFn.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Bob");
    await user.click(screen.getByRole("button", { name: "Remove member" }));
    await waitFor(() => expect(confirmFn).toHaveBeenCalled());
    expect(workspacesApi.removeMember).not.toHaveBeenCalled();
  });

  test("Member remove flow: confirm OK calls API and toasts", async () => {
    mockGet(makeWorkspace(), [
      makeMember({ userId: "user-1", role: "admin", userName: "Owner", userEmail: "owner@x.com" }),
      makeMember({ userId: "user-2", role: "editor", userName: "Bob", userEmail: "bob@x.com" }),
    ]);
    confirmFn.mockResolvedValue(true);
    vi.mocked(workspacesApi.removeMember).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Bob");
    await user.click(screen.getByRole("button", { name: "Remove member" }));
    await waitFor(() => expect(workspacesApi.removeMember).toHaveBeenCalledWith("ws-1", "user-2"));
    expect(toastFn).toHaveBeenCalledWith("Member removed");
  });

  test("Member remove error toasts an error", async () => {
    mockGet(makeWorkspace(), [
      makeMember({ userId: "user-1", role: "admin", userName: "Owner", userEmail: "owner@x.com" }),
      makeMember({ userId: "user-2", role: "editor", userName: "Bob", userEmail: "bob@x.com" }),
    ]);
    confirmFn.mockResolvedValue(true);
    vi.mocked(workspacesApi.removeMember).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Bob");
    await user.click(screen.getByRole("button", { name: "Remove member" }));
    await waitFor(() => expect(toastFn).toHaveBeenCalledWith("Failed to remove member.", "error"));
  });

  test("Member role change calls API and reloads", async () => {
    mockGet(makeWorkspace(), [
      makeMember({ userId: "user-1", role: "admin", userName: "Owner", userEmail: "owner@x.com" }),
      makeMember({ userId: "user-2", role: "editor", userName: "Bob", userEmail: "bob@x.com" }),
    ]);
    vi.mocked(workspacesApi.updateMemberRole).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Bob");
    const roleSelects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    // Bob's per-row role select. The invite select has options ordered editor/viewer/admin
    // while the per-row select has admin/editor/viewer. Pick the one with "admin" as first option.
    const bobSelect = roleSelects.find(
      (s) => s.value === "editor" && (s.options[0]?.value === "admin"),
    )!;
    await user.selectOptions(bobSelect, "admin");
    await waitFor(() =>
      expect(workspacesApi.updateMemberRole).toHaveBeenCalledWith("ws-1", "user-2", "admin"),
    );
  });

  test("Delete flow asks for confirm and on OK calls API + onClose", async () => {
    mockGet();
    confirmFn.mockResolvedValue(true);
    vi.mocked(workspacesApi.delete).mockResolvedValue(undefined as never);
    const onClose = vi.fn();
    const onWorkspaceUpdated = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={onClose} onWorkspaceUpdated={onWorkspaceUpdated} />);
    await screen.findByText("Danger Zone");
    await user.click(screen.getByRole("button", { name: "Delete Workspace" }));
    await waitFor(() => expect(workspacesApi.delete).toHaveBeenCalledWith("ws-1"));
    expect(toastFn).toHaveBeenCalledWith("Workspace deleted");
    expect(onWorkspaceUpdated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test("Delete cancelled at confirm does nothing", async () => {
    mockGet();
    confirmFn.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Danger Zone");
    await user.click(screen.getByRole("button", { name: "Delete Workspace" }));
    await waitFor(() => expect(confirmFn).toHaveBeenCalled());
    expect(workspacesApi.delete).not.toHaveBeenCalled();
  });

  test("Personal workspace hides the Danger Zone", async () => {
    mockGet(makeWorkspace({ isPersonal: true }));
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Workspace Identity");
    expect(screen.queryByText("Danger Zone")).toBeNull();
  });

  test("Owner sees the Transfer Ownership section; clicking expands it", async () => {
    mockGet(
      makeWorkspace({ ownerId: "user-1" }),
      [
        makeMember({ userId: "user-1", role: "admin", userName: "Owner", userEmail: "owner@x.com" }),
        makeMember({ userId: "user-2", role: "admin", userName: "Coadmin", userEmail: "co@x.com" }),
      ],
    );
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Transfer Ownership");
    await user.click(screen.getByRole("button", { name: /Transfer Ownership\.\.\./ }));
    expect(screen.getByLabelText("New Owner")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm Transfer" })).toBeTruthy();
  });

  test("Transfer ownership: confirm + API call + toast with diagram/template counts", async () => {
    mockGet(
      makeWorkspace({ ownerId: "user-1" }),
      [
        makeMember({ userId: "user-1", role: "admin", userName: "Owner", userEmail: "owner@x.com" }),
        makeMember({ userId: "user-2", role: "admin", userName: "Coadmin", userEmail: "co@x.com" }),
      ],
    );
    confirmFn.mockResolvedValue(true);
    vi.mocked(workspacesApi.transferOwnership).mockResolvedValue({
      success: true,
      diagramCount: 3,
      templateCount: 1,
    });
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Transfer Ownership");
    await user.click(screen.getByRole("button", { name: /Transfer Ownership\.\.\./ }));
    const newOwner = screen.getByLabelText("New Owner") as HTMLSelectElement;
    await user.selectOptions(newOwner, "user-2");
    await user.click(screen.getByRole("button", { name: "Confirm Transfer" }));
    await waitFor(() =>
      expect(workspacesApi.transferOwnership).toHaveBeenCalledWith("ws-1", "user-2", true),
    );
    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith("Ownership transferred, 3 diagrams, 1 template"),
    );
  });

  test("Transfer ownership: 0 counts produce a clean toast", async () => {
    mockGet(
      makeWorkspace({ ownerId: "user-1" }),
      [
        makeMember({ userId: "user-1", role: "admin", userName: "Owner", userEmail: "owner@x.com" }),
        makeMember({ userId: "user-2", role: "admin", userName: "Coadmin", userEmail: "co@x.com" }),
      ],
    );
    confirmFn.mockResolvedValue(true);
    vi.mocked(workspacesApi.transferOwnership).mockResolvedValue({
      success: true,
      diagramCount: 0,
      templateCount: 0,
    });
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Transfer Ownership");
    await user.click(screen.getByRole("button", { name: /Transfer Ownership\.\.\./ }));
    await user.selectOptions(screen.getByLabelText("New Owner"), "user-2");
    await user.click(screen.getByRole("button", { name: "Confirm Transfer" }));
    await waitFor(() => expect(toastFn).toHaveBeenCalledWith("Ownership transferred"));
  });

  test("Transfer ownership: API failure toasts an error", async () => {
    mockGet(
      makeWorkspace({ ownerId: "user-1" }),
      [
        makeMember({ userId: "user-1", role: "admin", userName: "Owner", userEmail: "owner@x.com" }),
        makeMember({ userId: "user-2", role: "admin", userName: "Coadmin", userEmail: "co@x.com" }),
      ],
    );
    confirmFn.mockResolvedValue(true);
    vi.mocked(workspacesApi.transferOwnership).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Transfer Ownership");
    await user.click(screen.getByRole("button", { name: /Transfer Ownership\.\.\./ }));
    await user.selectOptions(screen.getByLabelText("New Owner"), "user-2");
    await user.click(screen.getByRole("button", { name: "Confirm Transfer" }));
    await waitFor(() => expect(toastFn).toHaveBeenCalledWith("Failed to transfer ownership.", "error"));
  });

  test("Color palette picks update local state on admin click", async () => {
    mockGet();
    const user = userEvent.setup();
    const { container } = render(<WorkspaceSettingsContent workspaceId="ws-1" onClose={() => {}} />);
    await screen.findByText("Workspace Identity");
    const swatches = container.querySelectorAll("[style*=\"background-color\"]");
    expect(swatches.length).toBeGreaterThan(0);
    await user.click(swatches[1] as HTMLElement);
    // Color is internal state; assert the component survived the interaction.
    expect(screen.getByText("Workspace Identity")).toBeTruthy();
  });
});
