import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DeleteLinkUseCase } from "../../../application/use-cases/share/delete-link";
import { ListLinksUseCase } from "../../../application/use-cases/share/list-links";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryShareRepository } from "../../fakes/in-memory-share-repository";
import { FakeRealtimeNotifier } from "../../fakes/fake-realtime-notifier";
import { ForbiddenError, NotFoundError } from "../../../domain/errors";

async function setup() {
  const diagrams = new InMemoryDiagramRepository();
  const shares = new InMemoryShareRepository();
  const ownerId = randomUUID();
  const editorId = randomUUID();
  const viewerId = randomUUID();
  const diagram = await diagrams.create({ ownerId, title: "D" });
  diagrams.members.push(
    { diagramId: diagram.id, userId: editorId, role: "editor" },
    { diagramId: diagram.id, userId: viewerId, role: "viewer" },
  );
  const linkBy = (createdBy: string) =>
    shares.create({ diagramId: diagram.id, createdBy, role: "editor", expiresAt: null });
  return {
    shares,
    ownerId,
    editorId,
    viewerId,
    linkBy,
    list: new ListLinksUseCase(shares, diagrams),
    remove: new DeleteLinkUseCase(shares, diagrams, new FakeRealtimeNotifier()),
  };
}

describe("DeleteLinkUseCase — who may revoke", () => {
  it("lets the diagram owner delete a link an editor created", async () => {
    const { shares, ownerId, editorId, linkBy, remove } = await setup();
    const link = await linkBy(editorId);

    await remove.execute(link.token, ownerId);

    assert.equal(await shares.findByToken(link.token), null);
  });

  it("lets an editor delete their own link", async () => {
    const { shares, editorId, linkBy, remove } = await setup();
    const link = await linkBy(editorId);

    await remove.execute(link.token, editorId);

    assert.equal(await shares.findByToken(link.token), null);
  });

  it("does not let an editor delete a link someone else created", async () => {
    const { shares, ownerId, editorId, linkBy, remove } = await setup();
    const link = await linkBy(ownerId);

    await assert.rejects(() => remove.execute(link.token, editorId), NotFoundError);

    assert.notEqual(await shares.findByToken(link.token), null);
  });

  it("does not let a stranger delete any link", async () => {
    const { shares, ownerId, linkBy, remove } = await setup();
    const link = await linkBy(ownerId);

    await assert.rejects(() => remove.execute(link.token, randomUUID()), NotFoundError);

    assert.notEqual(await shares.findByToken(link.token), null);
  });
});

describe("ListLinksUseCase — who sees what", () => {
  it("shows the owner every link of the diagram", async () => {
    const { ownerId, editorId, linkBy, list } = await setup();
    await linkBy(ownerId);
    await linkBy(editorId);

    const links = await list.execute((await linkBy(ownerId)).diagramId, ownerId);

    assert.equal(links.length, 3);
  });

  it("shows an editor only the links they created", async () => {
    const { ownerId, editorId, linkBy, list } = await setup();
    await linkBy(ownerId);
    const own = await linkBy(editorId);

    const links = await list.execute(own.diagramId, editorId);

    assert.deepEqual(
      links.map((l) => l.token),
      [own.token],
    );
  });

  it("refuses a viewer and hides the diagram from a stranger", async () => {
    const { ownerId, viewerId, linkBy, list } = await setup();
    const { diagramId } = await linkBy(ownerId);

    await assert.rejects(() => list.execute(diagramId, viewerId), ForbiddenError);
    await assert.rejects(() => list.execute(diagramId, randomUUID()), NotFoundError);
  });
});
