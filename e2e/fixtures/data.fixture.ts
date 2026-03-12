import { APIRequestContext, expect } from "@playwright/test";

export async function createDiagram(request: APIRequestContext, title = "Test Diagram") {
  const res = await request.post("/api/diagrams", { data: { title } });
  expect(res.ok(), `createDiagram failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return { id: body.diagram?.id ?? body.id, title };
}

export async function createWorkspace(request: APIRequestContext, name = "Test Workspace") {
  const res = await request.post("/api/workspaces", { data: { name, description: "E2E test workspace" } });
  expect(res.ok(), `createWorkspace failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return { id: body.workspace?.id ?? body.id, name };
}

export async function createFolder(request: APIRequestContext, workspaceId: string, name = "Test Folder") {
  const res = await request.post("/api/folders", { data: { name, workspaceId } });
  expect(res.ok(), `createFolder failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return { id: body.folder?.id ?? body.id, name };
}

export async function createShareLink(request: APIRequestContext, diagramId: string, role = "viewer") {
  const res = await request.post(`/api/share/${diagramId}`, { data: { role } });
  expect(res.ok(), `createShareLink failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return { token: body.shareLink?.token ?? body.token, role };
}

export async function createTag(request: APIRequestContext, name = "test-tag", color = "#ff0000") {
  const res = await request.post("/api/tags", { data: { name, color } });
  expect(res.ok(), `createTag failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return { id: body.tag?.id ?? body.id, name, color };
}
