import { test, expect } from "@playwright/test";
import { createDiagram } from "../../fixtures/data.fixture";

test.describe("Scenes API", () => {
  test.describe.configure({ mode: "serial" });

  let diagramId: string;
  let sceneId: string;

  test.beforeAll(async ({ request }) => {
    const diagram = await createDiagram(request, "Scenes Test Diagram");
    diagramId = diagram.id;
  });

  test("POST /api/diagrams/:id/scenes creates a scene", async ({
    request,
  }) => {
    const response = await request.post(
      `/api/diagrams/${diagramId}/scenes`,
      { data: { name: "Test Scene" } }
    );
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const scene = body.scene ?? body;
    expect(scene).toHaveProperty("id");
    expect(scene.name).toBe("Test Scene");
    sceneId = scene.id;
  });

  test("GET /api/diagrams/:id/scenes lists scenes", async ({ request }) => {
    const response = await request.get(
      `/api/diagrams/${diagramId}/scenes`
    );
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const scenes = body.scenes ?? body;
    expect(Array.isArray(scenes)).toBeTruthy();
    const found = scenes.find((s: any) => s.id === sceneId);
    expect(found).toBeTruthy();
  });

  test("GET /api/diagrams/:id/scenes/:sceneId returns a scene", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/diagrams/${diagramId}/scenes/${sceneId}`
    );
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const scene = body.scene ?? body;
    expect(scene.id).toBe(sceneId);
    expect(scene.name).toBe("Test Scene");
  });

  test("PATCH /api/diagrams/:id/scenes/:sceneId renames a scene", async ({
    request,
  }) => {
    const response = await request.patch(
      `/api/diagrams/${diagramId}/scenes/${sceneId}`,
      { data: { name: "Renamed Scene" } }
    );
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const scene = body.scene ?? body;
    expect(scene.name).toBe("Renamed Scene");
  });

  test("DELETE /api/diagrams/:id/scenes/:sceneId deletes a scene", async ({
    request,
  }) => {
    // Create a second scene so we can delete the first (can't delete the only scene)
    const secondRes = await request.post(
      `/api/diagrams/${diagramId}/scenes`,
      { data: { name: "Second Scene" } }
    );
    expect(secondRes.ok()).toBeTruthy();

    const response = await request.delete(
      `/api/diagrams/${diagramId}/scenes/${sceneId}`
    );
    expect(response.ok()).toBeTruthy();

    // Verify deletion
    const get = await request.get(
      `/api/diagrams/${diagramId}/scenes/${sceneId}`
    );
    expect(get.ok()).toBeFalsy();
  });
});
