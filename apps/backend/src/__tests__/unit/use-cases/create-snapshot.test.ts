import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { CreateSnapshotUseCase } from "../../../application/use-cases/snapshots/create-snapshot";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";
import { InMemorySnapshotRepository } from "../../fakes/in-memory-snapshot-repository";

async function setup() {
  const diagrams = new InMemoryDiagramRepository();
  const scenes = new InMemorySceneRepository();
  const snapshots = new InMemorySnapshotRepository();
  const diagram = await diagrams.create({ ownerId: randomUUID(), title: "D" });
  await scenes.create({
    diagramId: diagram.id,
    name: "Scene 1",
    sortOrder: 0,
    elements: [{ id: "el-1", type: "rectangle" }],
  });
  return { diagram, snapshots, useCase: new CreateSnapshotUseCase(snapshots, scenes, diagrams) };
}

describe("CreateSnapshotUseCase — automatic triggers need no diagram role", () => {
  it("records a close snapshot with no actor, as when the last guest editor leaves", async () => {
    const { diagram, snapshots, useCase } = await setup();

    await useCase.createAutomatic(diagram.id, "close", null, 1);

    assert.deepEqual(
      snapshots.store.map((s) => ({ trigger: s.trigger, createdBy: s.createdBy })),
      [{ trigger: "close", createdBy: null }],
    );
  });

  it("records an interval snapshot with no actor, as when a guest editor saves", async () => {
    const { diagram, snapshots, useCase } = await setup();

    await useCase.createAutomatic(diagram.id, "interval", null, 3);

    assert.deepEqual(
      snapshots.store.map((s) => ({
        trigger: s.trigger,
        createdBy: s.createdBy,
        activeUsers: s.activeUsers,
      })),
      [{ trigger: "interval", createdBy: null, activeUsers: 3 }],
    );
  });
});
