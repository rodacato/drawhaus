import { test, expect } from "../../fixtures/test";
import { createTemplate, getDiagram } from "../../fixtures/api";

type Template = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  elements: unknown[];
};

test.describe("Templates API", () => {
  test("a created template is listed and readable", async ({ request }) => {
    const created = await createTemplate(request, {
      title: "E2E Test Template",
      category: "architecture",
      description: "Created by e2e test",
    });

    const list = await request.get("/api/templates");
    expect(list.ok()).toBeTruthy();
    const { templates } = (await list.json()) as { templates: Template[] };
    expect(templates.find((t) => t.id === created.id)?.title).toBe("E2E Test Template");

    const one = await request.get(`/api/templates/${created.id}`);
    expect(one.ok()).toBeTruthy();
    const { template } = (await one.json()) as { template: Template };
    expect(template.category).toBe("architecture");
    expect(template.elements).toHaveLength(1);
  });

  test("updating a template persists its title and description", async ({ request }) => {
    const created = await createTemplate(request, { title: "Before Update" });

    const res = await request.patch(`/api/templates/${created.id}`, {
      data: { title: "Updated Template", description: "Updated description" },
    });
    expect(res.ok()).toBeTruthy();

    const { template } = (await (await request.get(`/api/templates/${created.id}`)).json()) as {
      template: Template;
    };
    expect(template.title).toBe("Updated Template");
    expect(template.description).toBe("Updated description");
  });

  test("using a template creates a diagram with its elements", async ({ request }) => {
    const created = await createTemplate(request, { title: "Seed Template" });

    const res = await request.post(`/api/templates/${created.id}/use`, {
      data: { title: "From Template" },
    });
    expect(res.status()).toBe(201);
    const { diagram } = (await res.json()) as { diagram: { id: string } };

    const full = await getDiagram(request, diagram.id);
    expect(full.title).toBe("From Template");
    expect(full.elements.map((e) => e.type)).toEqual(["rectangle"]);
  });

  test("a deleted template can no longer be read", async ({ request }) => {
    const created = await createTemplate(request, { title: "Delete Me" });

    expect((await request.delete(`/api/templates/${created.id}`)).ok()).toBeTruthy();

    expect((await request.get(`/api/templates/${created.id}`)).ok()).toBeFalsy();
  });

  test("creating a template without title and elements is rejected", async ({ request }) => {
    const response = await request.post("/api/templates", {
      data: { description: "Missing title and elements" },
    });
    expect(response.status()).toBe(400);
  });
});
