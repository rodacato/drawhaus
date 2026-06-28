import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DiagramCard } from "../components/DiagramCard";
import { DiagramListRow } from "../components/DiagramListRow";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DriveImportModal } from "../components/DriveImportModal";
import type { Diagram } from "../lib/hooks/useDashboardData";

const diagram = { id: "d1", title: "My Diagram", folderId: null, thumbnail: null, tags: [] } as unknown as Diagram;

describe("DiagramCard — smoke", () => {
  test("renders the diagram title", () => {
    render(
      <MemoryRouter>
        <DiagramCard
          diagram={diagram}
          folders={[]}
          allTags={[]}
          onMove={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onToggleStar={vi.fn()}
          onShare={vi.fn()}
          onEmbed={vi.fn()}
          onRename={vi.fn()}
          onToggleTag={vi.fn()}
          onCreateTag={vi.fn()}
          onDeleteTag={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("My Diagram")).toBeTruthy();
  });
});

describe("DiagramListRow — smoke", () => {
  test("renders the diagram title", () => {
    render(
      <MemoryRouter>
        <DiagramListRow
          diagram={diagram}
          onRename={vi.fn()}
          onToggleStar={vi.fn()}
          onShare={vi.fn()}
          onEmbed={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("My Diagram")).toBeTruthy();
  });
});

describe("ErrorBoundary — smoke", () => {
  function Boom(): never { throw new Error("boom"); }
  function Fallback() { return <div>FALLBACK</div>; }

  test("renders the fallback when a child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary FallbackComponent={Fallback}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("FALLBACK")).toBeTruthy();
  });
});

describe("DriveImportModal — smoke", () => {
  test("renders nothing while closed", () => {
    const { container } = render(<DriveImportModal open={false} onClose={vi.fn()} onImported={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
