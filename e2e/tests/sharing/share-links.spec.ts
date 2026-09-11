import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { createDiagram, createShareLink } from "../../fixtures/api";

type Resolved = { share: { token: string; role: string }; diagram: { id: string } };

async function linkTokens(api: APIRequestContext, diagramId: string) {
  const res = await api.get(`/api/share/${diagramId}/links`);
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { links: { token: string }[] }).links.map((l) => l.token);
}

test.describe("Share Links", () => {
  for (const role of ["viewer", "editor"] as const) {
    test(`a ${role} link resolves anonymously to its diagram and role`, async ({
      request,
      anonApi,
    }) => {
      const diagram = await createDiagram(request, { title: `Share ${role} Test` });
      const token = await createShareLink(request, diagram.id, role);

      const res = await anonApi.get(`/api/share/link/${token}`);

      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as Resolved;
      expect(body.diagram.id).toBe(diagram.id);
      expect(body.share.role).toBe(role);
    });
  }

  test("the owner can list a diagram's links", async ({ request }) => {
    const diagram = await createDiagram(request, { title: "Share List Test" });
    const token = await createShareLink(request, diagram.id, "viewer");

    expect(await linkTokens(request, diagram.id)).toContain(token);
  });

  test("a revoked link no longer resolves", async ({ request, anonApi }) => {
    const diagram = await createDiagram(request, { title: "Share Revoke Test" });
    const token = await createShareLink(request, diagram.id, "viewer");

    expect((await request.delete(`/api/share/link/${token}`)).ok()).toBeTruthy();

    expect((await anonApi.get(`/api/share/link/${token}`)).ok()).toBeFalsy();
    expect(await linkTokens(request, diagram.id)).not.toContain(token);
  });

  test("another user can neither list nor revoke the owner's links", async ({
    request,
    anonApi,
    createUser,
  }) => {
    const outsider = await createUser("outsider");
    const diagram = await createDiagram(request, { title: "Share Guarded Test" });
    const token = await createShareLink(request, diagram.id, "editor");

    expect((await outsider.api.get(`/api/share/${diagram.id}/links`)).ok()).toBeFalsy();
    expect((await outsider.api.delete(`/api/share/link/${token}`)).ok()).toBeFalsy();

    expect((await anonApi.get(`/api/share/link/${token}`)).ok()).toBeTruthy();
  });
});
