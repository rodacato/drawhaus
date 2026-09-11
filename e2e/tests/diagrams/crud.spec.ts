import { test, expect } from "../../fixtures/test";
import { createDiagram, getDiagram } from "../../fixtures/api";

test.describe("Diagram CRUD", () => {
  test("a created diagram can be read back", async ({ request }) => {
    const diagram = await createDiagram(request, { title: "CRUD Get Test" });

    expect((await getDiagram(request, diagram.id)).title).toBe("CRUD Get Test");
  });

  test("updating the title persists", async ({ request }) => {
    const diagram = await createDiagram(request, { title: "CRUD Update Test" });

    const res = await request.patch(`/api/diagrams/${diagram.id}`, {
      data: { title: "Updated Title" },
    });
    expect(res.ok()).toBeTruthy();

    expect((await getDiagram(request, diagram.id)).title).toBe("Updated Title");
  });

  test("a deleted diagram is gone", async ({ request }) => {
    const diagram = await createDiagram(request, { title: "CRUD Delete Test" });

    expect((await request.delete(`/api/diagrams/${diagram.id}`)).ok()).toBeTruthy();

    const res = await request.get(`/api/diagrams/${diagram.id}`);
    expect([403, 404]).toContain(res.status());
  });

  test("duplicating creates a separate readable diagram", async ({ request }) => {
    const diagram = await createDiagram(request, { title: "CRUD Duplicate Test" });

    const res = await request.post(`/api/diagrams/${diagram.id}/duplicate`);
    expect(res.ok()).toBeTruthy();
    const { diagram: copy } = (await res.json()) as { diagram: { id: string } };

    expect(copy.id).not.toBe(diagram.id);
    expect((await getDiagram(request, copy.id)).id).toBe(copy.id);
  });

  test("the list includes a created diagram", async ({ request }) => {
    const diagram = await createDiagram(request, { title: "CRUD List Test" });

    const res = await request.get("/api/diagrams");
    expect(res.ok()).toBeTruthy();
    const { diagrams } = (await res.json()) as { diagrams: { id: string }[] };
    expect(diagrams.map((d) => d.id)).toContain(diagram.id);
  });
});
