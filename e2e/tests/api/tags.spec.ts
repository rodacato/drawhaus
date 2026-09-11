import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { createDiagram, createTag, getDiagram } from "../../fixtures/api";

const tagName = () => `e2e-tag-${randomUUID().slice(0, 8)}`;

async function listTags(api: APIRequestContext) {
  const res = await api.get("/api/tags");
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { tags: { id: string; name: string; color: string }[] }).tags;
}

test.describe("Tags API", () => {
  test("a created tag is listed with its color", async ({ request }) => {
    const name = tagName();

    const tag = await createTag(request, name, "#ff5733");

    expect((await listTags(request)).find((t) => t.id === tag.id)).toMatchObject({
      name,
      color: "#ff5733",
    });
  });

  test("renaming a tag persists", async ({ request }) => {
    const tag = await createTag(request, tagName());
    const renamed = `${tag.name}-updated`;

    const res = await request.patch(`/api/tags/${tag.id}`, { data: { name: renamed } });
    expect(res.ok()).toBeTruthy();

    expect((await listTags(request)).find((t) => t.id === tag.id)?.name).toBe(renamed);
  });

  test("assigning and unassigning a tag updates the diagram", async ({ request }) => {
    const tag = await createTag(request, tagName());
    const diagram = await createDiagram(request, { title: "Tags Test Diagram" });
    const tagIds = async () => (await getDiagram(request, diagram.id)).tags.map((t) => t.id);

    const assign = await request.post(`/api/tags/${tag.id}/assign`, {
      data: { diagramId: diagram.id },
    });
    expect(assign.ok()).toBeTruthy();
    expect(await tagIds()).toContain(tag.id);

    const unassign = await request.post(`/api/tags/${tag.id}/unassign`, {
      data: { diagramId: diagram.id },
    });
    expect(unassign.ok()).toBeTruthy();
    expect(await tagIds()).not.toContain(tag.id);
  });

  test("a deleted tag is gone", async ({ request }) => {
    const tag = await createTag(request, tagName());

    expect((await request.delete(`/api/tags/${tag.id}`)).ok()).toBeTruthy();

    expect((await listTags(request)).map((t) => t.id)).not.toContain(tag.id);
  });
});
