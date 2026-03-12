import { test, expect } from "@playwright/test";
import { createDiagram, createShareLink } from "../../fixtures/data.fixture";
import { unauthenticatedContext } from "../../fixtures/multi-user.fixture";

const BASE_URL = "http://localhost:5173";

test.describe("Share Links", () => {
  test("can create viewer share link", async ({ request }) => {
    const diagram = await createDiagram(request, "Share Viewer Test");
    const share = await createShareLink(request, diagram.id, "viewer");
    expect(share.token).toBeTruthy();
  });

  test("can create editor share link", async ({ request }) => {
    const diagram = await createDiagram(request, "Share Editor Test");
    const share = await createShareLink(request, diagram.id, "editor");
    expect(share.token).toBeTruthy();
  });

  test("can list share links for diagram", async ({ request }) => {
    const diagram = await createDiagram(request, "Share List Test");
    await createShareLink(request, diagram.id, "viewer");

    const res = await request.get(`/api/share/${diagram.id}/links`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const links = body.shareLinks ?? body.links ?? body;
    expect(Array.isArray(links)).toBeTruthy();
    expect(links.length).toBeGreaterThan(0);
  });

  test("can revoke share link", async ({ request }) => {
    const diagram = await createDiagram(request, "Share Revoke Test");
    const share = await createShareLink(request, diagram.id, "viewer");

    const deleteRes = await request.delete(`/api/share/link/${share.token}`);
    expect(deleteRes.ok()).toBeTruthy();
  });

  test("revoked link no longer resolves", async ({ request }) => {
    const diagram = await createDiagram(request, "Share Revoked Resolve");
    const share = await createShareLink(request, diagram.id, "viewer");
    await request.delete(`/api/share/link/${share.token}`);

    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.get(`/api/share/link/${share.token}`);
    expect(res.ok()).toBeFalsy();
    await noAuth.dispose();
  });

  test("share link resolves for unauthenticated users", async ({ request }) => {
    const diagram = await createDiagram(request, "Share Resolve Test");
    const share = await createShareLink(request, diagram.id, "viewer");

    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.get(`/api/share/link/${share.token}`);
    expect(res.ok()).toBeTruthy();
    await noAuth.dispose();
  });

  test("share link contains role information", async ({ request }) => {
    const diagram = await createDiagram(request, "Share Role Test");
    const share = await createShareLink(request, diagram.id, "editor");

    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.get(`/api/share/link/${share.token}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const role = body.share?.role ?? body.shareLink?.role ?? body.role;
    expect(role).toBe("editor");
    await noAuth.dispose();
  });
});
