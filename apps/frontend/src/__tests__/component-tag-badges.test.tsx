import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TagBadges } from "../components/shared/TagBadges";
import type { Tag } from "../api/tags";

describe("TagBadges", () => {
  test("renders nothing when tags array is empty", () => {
    const { container } = render(<TagBadges tags={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders one badge per tag with name + background color", () => {
    const tags: Tag[] = [
      { id: "t1", name: "urgent", color: "#ff0000" },
      { id: "t2", name: "draft", color: "#888888" },
    ];
    render(<TagBadges tags={tags} />);

    const urgent = screen.getByText("urgent");
    expect(urgent).toBeTruthy();
    expect(urgent.getAttribute("style")).toContain("background-color: rgb(255, 0, 0)");

    const draft = screen.getByText("draft");
    expect(draft).toBeTruthy();
    expect(draft.getAttribute("style")).toContain("background-color: rgb(136, 136, 136)");
  });
});
