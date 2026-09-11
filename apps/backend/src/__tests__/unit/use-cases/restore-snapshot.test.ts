import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RestoreSnapshotUseCase } from "../../../application/use-cases/snapshots/restore-snapshot";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";
import { InMemorySnapshotRepository } from "../../fakes/in-memory-snapshot-repository";

class FlakySnapshotRepository extends InMemorySnapshotRepository {
  failCreates = false;

  override async create(data: Parameters<InMemorySnapshotRepository["create"]>[0]) {
    if (this.failCreates) throw new Error("snapshot storage unavailable");
    return super.create(data);
  }
}

const OWNER_ID = "8f14e45f-ceea-4e7a-9b1f-0c5b8d6a1e21";
const CURRENT = [{ id: "current-1", type: "rectangle" }];
const FROZEN = [{ id: "frozen-1", type: "ellipse" }];

async function setup() {
  const diagrams = new InMemoryDiagramRepository();
  const scenes = new InMemorySceneRepository();
  const snapshots = new FlakySnapshotRepository();
  const diagram = await diagrams.create({ ownerId: OWNER_ID, title: "D" });
  const scene = await scenes.create({
    diagramId: diagram.id,
    name: "Scene 1",
    sortOrder: 0,
    elements: CURRENT,
    appState: { theme: "dark" },
  });
  const snapshot = await snapshots.create({
    diagramId: diagram.id,
    createdBy: OWNER_ID,
    trigger: "manual",
    name: "Frozen",
    elements: FROZEN,
    appState: {},
  });
  return {
    scene,
    snapshot,
    snapshots,
    restore: new RestoreSnapshotUseCase(snapshots, scenes, diagrams),
  };
}

describe("RestoreSnapshotUseCase", () => {
  it("backs up the current scene, then overwrites it with the snapshot", async () => {
    const { scene, snapshot, snapshots, restore } = await setup();

    await restore.execute(snapshot.id, OWNER_ID);

    assert.deepEqual(scene.elements, FROZEN);
    const backup = snapshots.store.find((s) => s.name === "Pre-restore backup");
    assert.deepEqual(backup?.elements, CURRENT);
  });

  it("aborts without touching the scene when the backup cannot be written", async () => {
    const { scene, snapshot, snapshots, restore } = await setup();
    snapshots.failCreates = true;

    await assert.rejects(
      () => restore.execute(snapshot.id, OWNER_ID),
      /snapshot storage unavailable/,
    );

    assert.deepEqual(scene.elements, CURRENT);
    assert.deepEqual(scene.appState, { theme: "dark" });
    assert.equal(snapshots.store.length, 1, "no backup was recorded either");
    assert.equal(scene.revision, 0, "an aborted restore does not move the revision");
  });

  it("moves the scene to a new revision, which it reports for the broadcast", async () => {
    const { scene, snapshot, restore } = await setup();

    const result = await restore.execute(snapshot.id, OWNER_ID);

    assert.equal(scene.revision, 1);
    assert.equal(result.revision, 1);
  });
});
