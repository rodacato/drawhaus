import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SnapshotPanel } from "../components/board-sidebar/SnapshotPanel";
import { ConfirmProvider } from "../components/ConfirmDialog";
import { ToastProvider } from "../components/Toast";
import { snapshotsApi, type SnapshotMeta } from "../api/snapshots";

function makeMeta(over: Partial<SnapshotMeta> = {}): SnapshotMeta {
  return {
    id: "s1",
    diagramId: "d1",
    createdBy: "u1",
    createdByName: "Ana",
    activeUsers: 1,
    trigger: "manual",
    name: "Release",
    createdAt: new Date().toISOString(),
    ...over,
  };
}

function renderPanel() {
  const excalidrawApiRef = { current: null } as React.RefObject<never>;
  render(
    <ToastProvider>
      <ConfirmProvider>
        <SnapshotPanel diagramId="d1" canEdit excalidrawApiRef={excalidrawApiRef} />
      </ConfirmProvider>
    </ToastProvider>,
  );
}

describe("SnapshotPanel", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("a failed load shows an error with a retry instead of 'No snapshots yet'", async () => {
    const list = vi.spyOn(snapshotsApi, "list").mockRejectedValueOnce(new Error("boom"));
    renderPanel();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not load the versions.",
    );
    expect(screen.queryByText(/No snapshots yet/)).toBeNull();

    list.mockResolvedValue({ snapshots: [makeMeta()] });
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Release")).toBeTruthy();
  });

  test("a failed version creation says so", async () => {
    vi.spyOn(snapshotsApi, "list").mockResolvedValue({ snapshots: [] });
    vi.spyOn(snapshotsApi, "create").mockRejectedValue(new Error("nope"));
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Create Version" }));
    expect(await screen.findByText("Could not create the version.")).toBeTruthy();
  });

  test("deleting a version asks first and only then deletes it", async () => {
    vi.spyOn(snapshotsApi, "list").mockResolvedValue({ snapshots: [makeMeta()] });
    const remove = vi.spyOn(snapshotsApi, "delete").mockResolvedValue(undefined as never);
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Version actions" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText(/Delete “Release”\? This cannot be undone\./)).toBeTruthy();
    expect(remove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(remove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Version actions" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    await waitFor(() => expect(remove).toHaveBeenCalledWith("d1", "s1"));
  });

  test("a failed restore keeps the confirmation open and reports it", async () => {
    vi.spyOn(snapshotsApi, "list").mockResolvedValue({ snapshots: [makeMeta()] });
    vi.spyOn(snapshotsApi, "get").mockRejectedValue(new Error("nope"));
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Version actions" }));
    await userEvent.click(screen.getByRole("button", { name: "Restore" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /Restore/ }));

    expect(await screen.findByText("Could not restore that version.")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
