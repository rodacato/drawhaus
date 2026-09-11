import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { createDiagram } from "../../fixtures/api";

type Thread = { id: string; body: string; resolved: boolean };

async function newThread(api: APIRequestContext, body = "This is a test comment") {
  const diagram = await createDiagram(api, { title: "Comments Test Diagram" });
  const res = await api.post(`/api/diagrams/${diagram.id}/comments`, {
    data: { body, elementId: "test-element-1" },
  });
  expect(res.status()).toBe(201);
  const { thread } = (await res.json()) as { thread: Thread };
  return { diagramId: diagram.id, thread };
}

async function listThreads(api: APIRequestContext, diagramId: string) {
  const res = await api.get(`/api/diagrams/${diagramId}/comments`);
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { threads: Thread[] }).threads;
}

async function setResolved(
  api: APIRequestContext,
  diagramId: string,
  threadId: string,
  resolved: boolean,
) {
  const res = await api.patch(`/api/diagrams/${diagramId}/comments/${threadId}/resolve`, {
    data: { resolved },
  });
  expect(res.ok()).toBeTruthy();
}

test.describe("Comments API", () => {
  test("a created thread is listed on its diagram", async ({ request }) => {
    const { diagramId, thread } = await newThread(request);

    expect(thread.body).toBe("This is a test comment");
    expect((await listThreads(request, diagramId)).map((t) => t.id)).toContain(thread.id);
  });

  test("replying to a thread returns the reply", async ({ request }) => {
    const { diagramId, thread } = await newThread(request);

    const res = await request.post(`/api/diagrams/${diagramId}/comments/${thread.id}/replies`, {
      data: { body: "This is a reply" },
    });

    expect(res.status()).toBe(201);
    expect((await res.json()).reply.body).toBe("This is a reply");
  });

  test("resolving and reopening a thread toggles its state", async ({ request }) => {
    const { diagramId, thread } = await newThread(request);
    const stateOf = async () =>
      (await listThreads(request, diagramId)).find((t) => t.id === thread.id)?.resolved;

    await setResolved(request, diagramId, thread.id, true);
    expect(await stateOf()).toBe(true);

    await setResolved(request, diagramId, thread.id, false);
    expect(await stateOf()).toBe(false);
  });

  test("liking a thread succeeds", async ({ request }) => {
    const { diagramId, thread } = await newThread(request);

    const res = await request.post(`/api/diagrams/${diagramId}/comments/${thread.id}/like`);

    expect(res.ok()).toBeTruthy();
  });

  test("a deleted thread disappears from the list", async ({ request }) => {
    const { diagramId, thread } = await newThread(request);

    const res = await request.delete(`/api/diagrams/${diagramId}/comments/${thread.id}`);
    expect(res.ok()).toBeTruthy();

    expect((await listThreads(request, diagramId)).map((t) => t.id)).not.toContain(thread.id);
  });
});
