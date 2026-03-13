import { test, expect } from "@playwright/test";
import { API_TESTS_USER } from "../../fixtures/multi-user.fixture";

test.use({ storageState: API_TESTS_USER.authFile });

test.describe("Templates API", () => {
  test.describe.configure({ mode: "serial" });

  let templateId: string;

  test("POST /api/templates creates a template", async ({ request }) => {
    const response = await request.post("/api/templates", {
      data: {
        title: "E2E Test Template",
        description: "Created by e2e test",
        category: "architecture",
        elements: [{ type: "rectangle", id: "r1", x: 0, y: 0, width: 100, height: 100 }],
        appState: { zoom: 1 },
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const template = body.template ?? body;
    expect(template).toHaveProperty("id");
    expect(template.title).toBe("E2E Test Template");
    expect(template.category).toBe("architecture");
    templateId = template.id;
  });

  test("GET /api/templates lists templates including the created one", async ({
    request,
  }) => {
    const response = await request.get("/api/templates");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const templates = body.templates ?? body;
    expect(Array.isArray(templates)).toBeTruthy();
    const found = templates.find((t: any) => t.id === templateId);
    expect(found).toBeTruthy();
    expect(found.title).toBe("E2E Test Template");
  });

  test("GET /api/templates/:id returns a single template", async ({
    request,
  }) => {
    const response = await request.get(`/api/templates/${templateId}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const template = body.template ?? body;
    expect(template.id).toBe(templateId);
    expect(template.elements).toHaveLength(1);
  });

  test("PATCH /api/templates/:id updates a template", async ({ request }) => {
    const response = await request.patch(`/api/templates/${templateId}`, {
      data: { title: "Updated Template", description: "Updated description" },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const template = body.template ?? body;
    expect(template.title).toBe("Updated Template");
    expect(template.description).toBe("Updated description");
  });

  test("POST /api/templates/:id/use creates a diagram from template", async ({
    request,
  }) => {
    const response = await request.post(
      `/api/templates/${templateId}/use`,
      { data: { title: "From Template" } },
    );
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const diagram = body.diagram ?? body;
    expect(diagram).toHaveProperty("id");
    expect(diagram.title).toBe("From Template");
  });

  test("DELETE /api/templates/:id deletes a template", async ({ request }) => {
    const response = await request.delete(`/api/templates/${templateId}`);
    expect(response.ok()).toBeTruthy();

    // Verify deletion
    const check = await request.get(`/api/templates/${templateId}`);
    expect(check.ok()).toBeFalsy();
  });

  test("POST /api/templates validates required fields", async ({
    request,
  }) => {
    const response = await request.post("/api/templates", {
      data: { description: "Missing title and elements" },
    });
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });
});
