import type { Page } from "@playwright/test";
import type { StorageState, TestUser } from "../fixtures/test";
import {
  addWorkspaceMember,
  createDiagram,
  createWorkspace,
  type WorkspaceRole,
} from "../fixtures/api";
import { BoardPage } from "../pages/board.page";

type TeamFixtures = {
  createUser: (label?: string) => Promise<TestUser>;
  openAs: (storageState: StorageState) => Promise<Page>;
};

export async function sharedBoard(
  { createUser, openAs }: TeamFixtures,
  init: { title: string; elements?: unknown[]; teammateRole?: WorkspaceRole },
) {
  const owner = await createUser("owner");
  const teammate = await createUser("teammate");
  const workspace = await createWorkspace(owner.api, `${init.title} WS`);
  await addWorkspaceMember(owner.api, workspace.id, teammate, init.teammateRole ?? "editor");
  const diagram = await createDiagram(owner.api, {
    title: init.title,
    workspaceId: workspace.id,
    elements: init.elements,
  });
  return {
    owner,
    teammate,
    diagram,
    ownerBoard: new BoardPage(await openAs(owner.storageState)),
    teammateBoard: new BoardPage(await openAs(teammate.storageState)),
  };
}
