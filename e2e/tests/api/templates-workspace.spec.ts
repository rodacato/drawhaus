import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { addWorkspaceMember, createTemplate, createWorkspace } from "../../fixtures/api";

async function templateIds(api: APIRequestContext, query = "") {
  const res = await api.get(`/api/templates${query}`);
  expect(res.ok()).toBeTruthy();
  const { templates } = (await res.json()) as { templates: { id: string }[] };
  return templates.map((t) => t.id);
}

test.describe("Templates API — workspace scoping", () => {
  test("a workspace template records its workspace", async ({ createUser }) => {
    const user = await createUser("templates");
    const workspace = await createWorkspace(user.api, "Template Workspace");

    const template = await createTemplate(user.api, {
      title: "Workspace Shared Template",
      workspaceId: workspace.id,
    });

    expect(template.workspaceId).toBe(workspace.id);
  });

  test("the template list includes personal and workspace templates", async ({ createUser }) => {
    const user = await createUser("templates");
    const workspace = await createWorkspace(user.api, "Template Workspace");
    const personal = await createTemplate(user.api, { title: "Personal Only Template" });
    const shared = await createTemplate(user.api, {
      title: "Workspace Shared Template",
      workspaceId: workspace.id,
    });

    const ids = await templateIds(user.api);

    expect(ids).toContain(personal.id);
    expect(ids).toContain(shared.id);
  });

  test("filtering by workspace lists its template exactly once", async ({ createUser }) => {
    const user = await createUser("templates");
    const workspace = await createWorkspace(user.api, "Template Workspace");
    const shared = await createTemplate(user.api, {
      title: "Workspace Shared Template",
      workspaceId: workspace.id,
    });

    const ids = await templateIds(user.api, `?workspaceId=${workspace.id}`);

    expect(ids.filter((id) => id === shared.id)).toHaveLength(1);
  });

  test("workspace members see its templates and outsiders do not", async ({ createUser }) => {
    const owner = await createUser("owner");
    const member = await createUser("member");
    const outsider = await createUser("outsider");
    const workspace = await createWorkspace(owner.api, "Template Workspace");
    await addWorkspaceMember(owner.api, workspace.id, member, "editor");
    const shared = await createTemplate(owner.api, {
      title: "Team Template",
      workspaceId: workspace.id,
    });

    expect(await templateIds(member.api, `?workspaceId=${workspace.id}`)).toContain(shared.id);
    expect(await templateIds(outsider.api)).not.toContain(shared.id);
  });
});
