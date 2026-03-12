import { test, expect } from "@playwright/test";
import { createDiagram } from "../../fixtures/data.fixture";
import { API_TESTS_USER } from "../../fixtures/multi-user.fixture";

// Use a dedicated user for API tests to avoid resource conflicts
test.use({ storageState: API_TESTS_USER.authFile });

test.describe("Comments API", () => {
  test.describe.configure({ mode: "serial" });

  let diagramId: string;
  let threadId: string;

  test.beforeAll(async ({ request }) => {
    const diagram = await createDiagram(request, "Comments Test Diagram");
    diagramId = diagram.id;
  });

  test("POST /api/diagrams/:id/comments creates a comment thread", async ({
    request,
  }) => {
    const response = await request.post(
      `/api/diagrams/${diagramId}/comments`,
      { data: { body: "This is a test comment", elementId: "test-element-1" } }
    );
    expect(response.ok()).toBeTruthy();
    const resBody = await response.json();
    const thread = resBody.thread ?? resBody;
    expect(thread).toHaveProperty("id");
    expect(thread.body).toBe("This is a test comment");
    threadId = thread.id;
  });

  test("GET /api/diagrams/:id/comments lists comment threads", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/diagrams/${diagramId}/comments`
    );
    expect(response.ok()).toBeTruthy();
    const resBody = await response.json();
    const threads = resBody.threads ?? resBody;
    expect(Array.isArray(threads)).toBeTruthy();
    const found = threads.find((c: any) => c.id === threadId);
    expect(found).toBeTruthy();
  });

  test("POST /api/diagrams/:id/comments/:threadId/replies adds a reply", async ({
    request,
  }) => {
    const response = await request.post(
      `/api/diagrams/${diagramId}/comments/${threadId}/replies`,
      { data: { body: "This is a reply" } }
    );
    expect(response.ok()).toBeTruthy();
    const resBody = await response.json();
    const reply = resBody.reply ?? resBody;
    expect(reply.body).toBe("This is a reply");
  });

  test("PATCH /api/diagrams/:id/comments/:threadId/resolve resolves a thread", async ({
    request,
  }) => {
    const response = await request.patch(
      `/api/diagrams/${diagramId}/comments/${threadId}/resolve`,
      { data: { resolved: true } }
    );
    expect(response.ok()).toBeTruthy();

    // Verify resolved
    const threads = await request.get(
      `/api/diagrams/${diagramId}/comments`
    );
    const resBody = await threads.json();
    const allThreads = resBody.threads ?? resBody;
    const thread = allThreads.find((c: any) => c.id === threadId);
    expect(thread.resolved).toBeTruthy();
  });

  test("PATCH /api/diagrams/:id/comments/:threadId/resolve toggles unresolve", async ({
    request,
  }) => {
    const response = await request.patch(
      `/api/diagrams/${diagramId}/comments/${threadId}/resolve`,
      { data: { resolved: false } }
    );
    expect(response.ok()).toBeTruthy();

    const threads = await request.get(
      `/api/diagrams/${diagramId}/comments`
    );
    const resBody = await threads.json();
    const allThreads = resBody.threads ?? resBody;
    const thread = allThreads.find((c: any) => c.id === threadId);
    expect(thread.resolved).toBeFalsy();
  });

  test("POST /api/diagrams/:id/comments/:threadId/like toggles like", async ({
    request,
  }) => {
    const response = await request.post(
      `/api/diagrams/${diagramId}/comments/${threadId}/like`
    );
    expect(response.ok()).toBeTruthy();
  });

  test("DELETE /api/diagrams/:id/comments/:threadId deletes a thread", async ({
    request,
  }) => {
    const response = await request.delete(
      `/api/diagrams/${diagramId}/comments/${threadId}`
    );
    expect(response.ok()).toBeTruthy();

    // Verify deletion
    const threads = await request.get(
      `/api/diagrams/${diagramId}/comments`
    );
    const resBody = await threads.json();
    const allThreads = resBody.threads ?? resBody;
    const found = allThreads.find((c: any) => c.id === threadId);
    expect(found).toBeFalsy();
  });
});
