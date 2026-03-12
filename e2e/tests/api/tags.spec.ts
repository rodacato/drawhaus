import { test, expect } from "@playwright/test";
import { createDiagram } from "../../fixtures/data.fixture";
import { API_TESTS_USER } from "../../fixtures/multi-user.fixture";

// Use a dedicated user for API tests to avoid resource conflicts
test.use({ storageState: API_TESTS_USER.authFile });

test.describe("Tags API", () => {
  test.describe.configure({ mode: "serial" });

  let tagId: string;
  let diagramId: string;
  const tagName = `e2e-tag-${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    const diagram = await createDiagram(request, "Tags Test Diagram");
    diagramId = diagram.id;
  });

  test("POST /api/tags creates a new tag", async ({ request }) => {
    const response = await request.post("/api/tags", {
      data: { name: tagName, color: "#ff5733" },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const tag = body.tag ?? body;
    expect(tag).toHaveProperty("id");
    expect(tag.name).toBe(tagName);
    expect(tag.color).toBe("#ff5733");
    tagId = tag.id;
  });

  test("GET /api/tags lists all tags", async ({ request }) => {
    const response = await request.get("/api/tags");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const tags = body.tags ?? body;
    expect(Array.isArray(tags)).toBeTruthy();
    const found = tags.find((t: any) => t.id === tagId);
    expect(found).toBeTruthy();
  });

  test("PATCH /api/tags/:id updates a tag", async ({ request }) => {
    const response = await request.patch(`/api/tags/${tagId}`, {
      data: { name: `${tagName}-updated` },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const tag = body.tag ?? body;
    expect(tag.name).toBe(`${tagName}-updated`);
  });

  test("POST /api/tags/:id/assign assigns tag to diagram", async ({
    request,
  }) => {
    const response = await request.post(`/api/tags/${tagId}/assign`, {
      data: { diagramId },
    });
    expect(response.ok()).toBeTruthy();
  });

  test("POST /api/tags/:id/unassign removes tag from diagram", async ({
    request,
  }) => {
    const response = await request.post(`/api/tags/${tagId}/unassign`, {
      data: { diagramId },
    });
    expect(response.ok()).toBeTruthy();
  });

  test("DELETE /api/tags/:id deletes a tag", async ({ request }) => {
    const response = await request.delete(`/api/tags/${tagId}`);
    expect(response.ok()).toBeTruthy();

    // Verify deletion
    const list = await request.get("/api/tags");
    const body = await list.json();
    const tags = body.tags ?? body;
    const found = tags.find((t: any) => t.id === tagId);
    expect(found).toBeFalsy();
  });
});
