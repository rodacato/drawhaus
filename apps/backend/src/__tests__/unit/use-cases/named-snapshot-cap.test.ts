import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { CreateSnapshotUseCase } from "../../../application/use-cases/snapshots/create-snapshot";
import { RenameSnapshotUseCase } from "../../../application/use-cases/snapshots/rename-snapshot";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";
import { InMemorySnapshotRepository } from "../../fakes/in-memory-snapshot-repository";
import { ConflictError } from "../../../domain/errors";

async function setupAtCap() {
  const ownerId = randomUUID();
  const diagrams = new InMemoryDiagramRepository();
  const scenes = new InMemorySceneRepository();
  const snapshots = new InMemorySnapshotRepository();
  const diagram = await diagrams.create({ ownerId, title: "D" });
  await scenes.create({ diagramId: diagram.id, name: "S", sortOrder: 0, elements: [] });
  const create = new CreateSnapshotUseCase(snapshots, scenes, diagrams);
  for (let i = 0; i < 20; i++) await create.createManual(diagram.id, ownerId, `v${i}`);
  return { ownerId, diagram, snapshots, create, rename: new RenameSnapshotUseCase(snapshots, diagrams) };
}

describe("named snapshot cap", () => {
  it("rejects a 21st named snapshot with a conflict error, but still allows unnamed ones", async () => {
    const { ownerId, diagram, snapshots, create } = await setupAtCap();

    await assert.rejects(() => create.createManual(diagram.id, ownerId, "extra"), ConflictError);
    assert.equal(snapshots.store.length, 20);

    await create.createManual(diagram.id, ownerId);
    assert.equal(snapshots.store.length, 21);
  });

  it("rejects naming another snapshot at the cap with a conflict error, but allows renaming a named one", async () => {
    const { ownerId, diagram, snapshots, create, rename } = await setupAtCap();
    const unnamed = await create.createManual(diagram.id, ownerId);

    await assert.rejects(() => rename.execute(unnamed.id, ownerId, "extra"), ConflictError);

    const named = snapshots.store.find((s) => s.name === "v0")!;
    const renamed = await rename.execute(named.id, ownerId, "renamed");
    assert.equal(renamed.name, "renamed");
  });
});
