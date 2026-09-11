import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UpdateDiagramUseCase } from "../../../application/use-cases/diagrams/update-diagram";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

const ROW = [{ id: "row-1", type: "rectangle", version: 1 }];
const BOARD = [{ id: "board-1", type: "ellipse", version: 3 }];
const API = [{ id: "api-1", type: "diamond", version: 1 }];

function setup() {
  const diagrams = new InMemoryDiagramRepository();
  return {
    diagrams,
    scenes: diagrams.scenes,
    update: new UpdateDiagramUseCase(diagrams, diagrams.scenes),
  };
}

/** A diagram whose board was opened and edited: its scene has moved on from the row's copy. */
async function openedOnBoard({ diagrams, scenes }: ReturnType<typeof setup>) {
  const diagram = await diagrams.create({ ownerId: "user-1", title: "Board", elements: ROW });
  const scene = await scenes.create({
    diagramId: diagram.id,
    name: "Scene 1",
    sortOrder: 0,
    elements: BOARD,
    appState: { theme: "dark" },
  });
  return { diagram, scene };
}

describe("UpdateDiagramUseCase", () => {
  it("owner can update title", async () => {
    const { diagrams, update } = setup();
    const diagram = await diagrams.create({ ownerId: "user-1", title: "Old" });

    const updated = await update.execute(diagram.id, "user-1", { title: "New" });

    assert.equal(updated.title, "New");
  });

  it("editor can update", async () => {
    const { diagrams, update } = setup();
    const diagram = await diagrams.create({ ownerId: "user-1", title: "D" });
    diagrams.members.push({ diagramId: diagram.id, userId: "user-2", role: "editor" });

    const updated = await update.execute(diagram.id, "user-2", { title: "Edited" });

    assert.equal(updated.title, "Edited");
  });

  it("viewer cannot update, and the scene keeps its content", async () => {
    const ctx = setup();
    const { diagram, scene } = await openedOnBoard(ctx);
    ctx.diagrams.members.push({ diagramId: diagram.id, userId: "user-2", role: "viewer" });

    await assert.rejects(
      () => ctx.update.execute(diagram.id, "user-2", { elements: API }),
      (err: unknown) => err instanceof ForbiddenError,
    );
    assert.deepEqual(scene.elements, BOARD);
  });

  it("stranger gets not found", async () => {
    const { diagrams, update } = setup();
    const diagram = await diagrams.create({ ownerId: "user-1", title: "D" });

    await assert.rejects(
      () => update.execute(diagram.id, "user-3", { title: "Nope" }),
      (err: unknown) => err instanceof NotFoundError,
    );
  });
});

describe("UpdateDiagramUseCase — content is written to the first scene", () => {
  it("replaces the scene's elements rather than merging them, and mirrors them on the row", async () => {
    const ctx = setup();
    const { diagram, scene } = await openedOnBoard(ctx);

    const updated = await ctx.update.execute(diagram.id, "user-1", { elements: API });

    assert.deepEqual(scene.elements, API);
    assert.deepEqual(scene.appState, { theme: "dark" }, "appState was not sent, so it is kept");
    assert.deepEqual(updated.elements, API);
    assert.deepEqual((await ctx.diagrams.findById(diagram.id))?.elements, API);
  });

  it("creates the first scene when the board was never opened, seeded from the row", async () => {
    const { diagrams, scenes, update } = setup();
    const diagram = await diagrams.create({ ownerId: "user-1", title: "Fresh", elements: ROW });

    await update.execute(diagram.id, "user-1", { appState: { gridSize: 20 } });

    assert.equal(scenes.store.length, 1);
    assert.equal(scenes.store[0].name, "Scene 1");
    assert.deepEqual(scenes.store[0].elements, ROW);
    assert.deepEqual(scenes.store[0].appState, { gridSize: 20 });
  });

  it("a title-only update leaves the scene untouched and answers with its content", async () => {
    const ctx = setup();
    const { diagram, scene } = await openedOnBoard(ctx);
    const touchedAt = scene.updatedAt;

    const updated = await ctx.update.execute(diagram.id, "user-1", { title: "Renamed" });

    assert.equal(scene.updatedAt, touchedAt);
    assert.deepEqual(scene.elements, BOARD);
    assert.deepEqual(updated.elements, BOARD, "not the row's stale copy");
  });

  it("a title-only update does not create a scene", async () => {
    const { diagrams, scenes, update } = setup();
    const diagram = await diagrams.create({ ownerId: "user-1", title: "Fresh", elements: ROW });

    await update.execute(diagram.id, "user-1", { title: "Renamed" });

    assert.equal(scenes.store.length, 0);
  });
});
