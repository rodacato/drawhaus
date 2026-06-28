import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DriveSyncBadge } from "../components/DriveSyncBadge";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { OfflineRecoveryDialog } from "../components/OfflineRecoveryDialog";
import type { OfflineSnapshot } from "@/lib/offline-storage";

describe("DriveSyncBadge — smoke", () => {
  test("renders a label for an active state", () => {
    render(<DriveSyncBadge state="synced" />);
    expect(screen.getByText("Drive synced")).toBeTruthy();
  });
  test("renders nothing while idle", () => {
    const { container } = render(<DriveSyncBadge state="idle" />);
    expect(container.firstChild).toBeNull();
  });
});

describe("ConnectionBadge — smoke", () => {
  test("renders the error message", () => {
    render(<ConnectionBadge connectionState="error" connectionError="boom" />);
    expect(screen.getByText("boom")).toBeTruthy();
  });
  test("renders nothing when connected", () => {
    const { container } = render(<ConnectionBadge connectionState="connected" connectionError={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("OfflineRecoveryDialog — smoke", () => {
  const snapshot = {
    diagramId: "d1",
    elements: [],
    appState: {},
    savedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  } as unknown as OfflineSnapshot;

  test("renders the recovery prompt", () => {
    render(
      <OfflineRecoveryDialog
        snapshot={snapshot}
        onKeepMine={vi.fn()}
        onKeepServer={vi.fn()}
        onSaveAsSnapshot={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: /offline changes detected/i })).toBeTruthy();
  });
});
