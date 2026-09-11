import type { APIRequestContext, APIResponse } from "@playwright/test";
import type { TestUser } from "./test";

export type ShareRole = "viewer" | "editor";
export type WorkspaceRole = "viewer" | "editor" | "admin";

export type SceneElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  version: number;
  isDeleted?: boolean;
  text?: string;
};

export type Diagram = {
  id: string;
  title: string;
  ownerId: string;
  workspaceId: string | null;
  starred: boolean;
  tags: { id: string; name: string; color: string }[];
  elements: SceneElement[];
};

async function body<T>(res: APIResponse, action: string): Promise<T> {
  if (!res.ok()) {
    throw new Error(`${action} failed with ${res.status()}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

function required<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${what} missing from the response`);
  }
  return value;
}

export async function createDiagram(
  api: APIRequestContext,
  init: { title?: string; workspaceId?: string; elements?: unknown[] } = {},
): Promise<Diagram> {
  const { diagram } = await body<{ diagram: Diagram }>(
    await api.post("/api/diagrams", { data: { title: "E2E diagram", ...init } }),
    "create diagram",
  );
  return diagram;
}

export async function getDiagram(api: APIRequestContext, id: string): Promise<Diagram> {
  const { diagram } = await body<{ diagram: Diagram }>(
    await api.get(`/api/diagrams/${id}`),
    "get diagram",
  );
  return diagram;
}

export async function liveElementIds(api: APIRequestContext, diagramId: string) {
  const { elements } = await getDiagram(api, diagramId);
  return elements.filter((e) => !e.isDeleted).map((e) => e.id);
}

export async function createShareLink(
  api: APIRequestContext,
  diagramId: string,
  role: ShareRole,
): Promise<string> {
  const { shareLink } = await body<{ shareLink: { token: string } }>(
    await api.post(`/api/share/${diagramId}`, { data: { role } }),
    `create ${role} share link`,
  );
  return required(shareLink.token, "share token");
}

export async function createWorkspace(api: APIRequestContext, name = "E2E workspace") {
  const { workspace } = await body<{ workspace: { id: string; name: string } }>(
    await api.post("/api/workspaces", { data: { name } }),
    "create workspace",
  );
  return workspace;
}

export async function personalWorkspaceId(api: APIRequestContext): Promise<string> {
  const { workspaces } = await body<{ workspaces: { id: string; isPersonal: boolean }[] }>(
    await api.get("/api/workspaces"),
    "list workspaces",
  );
  return required(workspaces.find((w) => w.isPersonal)?.id, "personal workspace");
}

export async function inviteToWorkspace(
  api: APIRequestContext,
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
): Promise<string> {
  const { invitation } = await body<{ invitation: { token: string } }>(
    await api.post(`/api/workspaces/${workspaceId}/invite`, { data: { email, role } }),
    "invite to workspace",
  );
  return required(invitation.token, "workspace invitation token");
}

export async function addWorkspaceMember(
  ownerApi: APIRequestContext,
  workspaceId: string,
  member: TestUser,
  role: WorkspaceRole,
) {
  const token = await inviteToWorkspace(ownerApi, workspaceId, member.email, role);
  await body(
    await member.api.post("/api/workspaces/accept-invite", { data: { token } }),
    "accept workspace invitation",
  );
}

export async function createUserInvite(adminApi: APIRequestContext, email: string) {
  const { invitation } = await body<{ invitation: { token: string } }>(
    await adminApi.post("/api/admin/invite", { data: { email } }),
    "create user invitation",
  );
  return required(invitation.token, "user invitation token");
}

export async function createFolder(api: APIRequestContext, workspaceId: string, name: string) {
  const { folder } = await body<{ folder: { id: string; name: string } }>(
    await api.post("/api/folders", { data: { name, workspaceId } }),
    "create folder",
  );
  return folder;
}

export async function createTag(api: APIRequestContext, name: string, color = "#ff5733") {
  const { tag } = await body<{ tag: { id: string; name: string; color: string } }>(
    await api.post("/api/tags", { data: { name, color } }),
    "create tag",
  );
  return tag;
}

export async function createTemplate(
  api: APIRequestContext,
  init: { title: string; category?: string; workspaceId?: string; description?: string },
) {
  const { template } = await body<{
    template: { id: string; title: string; workspaceId: string | null };
  }>(
    await api.post("/api/templates", {
      data: {
        category: "general",
        elements: [rectangle("template-rect")],
        appState: {},
        ...init,
      },
    }),
    "create template",
  );
  return template;
}

export async function createSnapshot(api: APIRequestContext, diagramId: string, name: string) {
  const { snapshot } = await body<{ snapshot: { id: string } }>(
    await api.post(`/api/diagrams/${diagramId}/snapshots`, { data: { name } }),
    "create snapshot",
  );
  return snapshot;
}

// Filled, because Excalidraw only hit-tests the outline of a transparent shape.
export function rectangle(id: string, x = 100, y = 100, width = 160, height = 100) {
  return {
    id,
    type: "rectangle",
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "#a5d8ff",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: 1,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
  };
}
