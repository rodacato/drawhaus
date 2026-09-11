import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../../infrastructure/db";
import { PgDiagramRepository } from "../../infrastructure/persistence/pg-diagram-repository";
import { PgSnapshotRepository } from "../../infrastructure/persistence/pg-snapshot-repository";
import { createUser } from "./fixtures";
import { useTestDatabase } from "./test-database";

useTestDatabase();

const diagrams = new PgDiagramRepository();
const snapshots = new PgSnapshotRepository();

const byId = (a: string, b: string) => a.localeCompare(b);

async function newDiagram(): Promise<string> {
  return (await diagrams.create({ title: "D", ownerId: await createUser() })).id;
}

/** A null name is an automatic snapshot, the only kind purgeAuto may delete. */
async function snapshotAged(
  diagramId: string,
  daysAgo: number,
  name: string | null = null,
): Promise<string> {
  const { id } = await snapshots.create({
    diagramId,
    createdBy: null,
    trigger: name ? "manual" : "interval",
    name,
    elements: [],
    appState: {},
  });
  await pool.query(
    "UPDATE diagram_snapshots SET created_at = now() - make_interval(days => $2) WHERE id = $1",
    [id, daysAgo],
  );
  return id;
}

async function remainingIds(diagramId: string): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>(
    "SELECT id FROM diagram_snapshots WHERE diagram_id = $1",
    [diagramId],
  );
  return rows.map((r) => r.id).sort(byId);
}

describe("PgSnapshotRepository", () => {
  it("findLatestForDiagram returns the diagram's newest snapshot, whatever other diagrams hold", async () => {
    const diagramId = await newDiagram();
    const otherId = await newDiagram();
    await snapshotAged(diagramId, 3);
    const newest = await snapshotAged(diagramId, 1);
    await snapshotAged(otherId, 0);

    assert.equal((await snapshots.findLatestForDiagram(diagramId))?.id, newest);
  });

  it("findLatestForDiagram returns null for a diagram without snapshots", async () => {
    assert.equal(await snapshots.findLatestForDiagram(await newDiagram()), null);
  });

  it("counts only named snapshots, per diagram, leaving empty diagrams out of the batch", async () => {
    const diagramId = await newDiagram();
    const otherId = await newDiagram();
    const emptyId = await newDiagram();
    await snapshotAged(diagramId, 1, "v1");
    await snapshotAged(diagramId, 2, "v2");
    await snapshotAged(diagramId, 3);
    await snapshotAged(otherId, 1, "v1");

    assert.equal(await snapshots.countNamed(diagramId), 2);
    assert.deepEqual(
      await snapshots.countNamedBatch([diagramId, otherId, emptyId]),
      new Map([
        [diagramId, 2],
        [otherId, 1],
      ]),
    );
  });

  it("purgeAuto keeps the newest keepCount automatic snapshots and any younger than keepDays", async () => {
    const diagramId = await newDiagram();
    const otherId = await newDiagram();
    const kept = [
      await snapshotAged(diagramId, 1),
      await snapshotAged(diagramId, 2),
      await snapshotAged(diagramId, 3),
      await snapshotAged(diagramId, 60, "Release"),
    ];
    await snapshotAged(diagramId, 10);
    await snapshotAged(diagramId, 20);
    const otherDiagrams = await snapshotAged(otherId, 40);

    kept.sort(byId);

    const deleted = await snapshots.purgeAuto(diagramId, 2, 7);

    assert.equal(deleted, 2);
    assert.deepEqual(await remainingIds(diagramId), kept);
    assert.deepEqual(await remainingIds(otherId), [otherDiagrams]);
  });

  it("purgeAuto never deletes a named snapshot, however old", async () => {
    const diagramId = await newDiagram();
    const named = await snapshotAged(diagramId, 365, "v1");
    await snapshotAged(diagramId, 30);
    await snapshotAged(diagramId, 40);

    const deleted = await snapshots.purgeAuto(diagramId, 0, 0);

    assert.equal(deleted, 2);
    assert.deepEqual(await remainingIds(diagramId), [named]);
  });
});
