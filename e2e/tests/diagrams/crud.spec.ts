import { test, expect } from "@playwright/test";
import { createDiagram } from "../../fixtures/data.fixture";

test.describe("Diagram CRUD", () => {
  test("can create diagram", async ({ request }) => {
    const diagram = await createDiagram(request, "CRUD Create Test");
    expect(diagram.id).toBeTruthy();
  });

  test("can get diagram by id", async ({ request }) => {
    const diagram = await createDiagram(request, "CRUD Get Test");
    const res = await request.get(`/api/diagrams/${diagram.id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const d = body.diagram ?? body;
    expect(d.title).toBe("CRUD Get Test");
  });

  test("can update diagram title", async ({ request }) => {
    const diagram = await createDiagram(request, "CRUD Update Test");
    const res = await request.patch(`/api/diagrams/${diagram.id}`, {
      data: { title: "Updated Title" },
    });
    expect(res.ok()).toBeTruthy();

    const getRes = await request.get(`/api/diagrams/${diagram.id}`);
    const body = await getRes.json();
    expect((body.diagram ?? body).title).toBe("Updated Title");
  });

  test("can delete diagram", async ({ request }) => {
    const diagram = await createDiagram(request, "CRUD Delete Test");
    const res = await request.delete(`/api/diagrams/${diagram.id}`);
    expect(res.ok()).toBeTruthy();

    const getRes = await request.get(`/api/diagrams/${diagram.id}`);
    expect(getRes.ok()).toBeFalsy();
  });

  test("can duplicate diagram", async ({ request }) => {
    const diagram = await createDiagram(request, "CRUD Duplicate Test");
    const res = await request.post(`/api/diagrams/${diagram.id}/duplicate`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const dup = body.diagram ?? body;
    expect(dup.id).not.toBe(diagram.id);
  });

  test("can list diagrams", async ({ request }) => {
    await createDiagram(request, "CRUD List Test");
    const res = await request.get("/api/diagrams");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const diagrams = body.diagrams ?? body;
    expect(Array.isArray(diagrams)).toBeTruthy();
    expect(diagrams.length).toBeGreaterThan(0);
  });

  test("can search diagrams", async ({ request }) => {
    const unique = `CRUDSearch_${Date.now()}`;
    await createDiagram(request, unique);
    const res = await request.get(`/api/diagrams/search?q=${unique}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const diagrams = body.diagrams ?? body;
    expect(diagrams.length).toBeGreaterThanOrEqual(1);
  });

  test("deleted diagram returns 404", async ({ request }) => {
    const diagram = await createDiagram(request, "CRUD 404 Test");
    await request.delete(`/api/diagrams/${diagram.id}`);
    const res = await request.get(`/api/diagrams/${diagram.id}`);
    expect([403, 404].includes(res.status())).toBeTruthy();
  });
});
