import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Client } from "pg";
import { config } from "../../infrastructure/config";
import { PgDiagramRepository } from "../../infrastructure/persistence/pg-diagram-repository";
import { PgSceneRepository } from "../../infrastructure/persistence/pg-scene-repository";
import { createUser, waitForLockWaiter } from "./fixtures";
import { useTestDatabase } from "./test-database";

useTestDatabase();

const diagrams = new PgDiagramRepository();
const scenes = new PgSceneRepository();

const element = (id: string) => ({ id, version: 1 });

async function sceneWith(elements: unknown[]) {
  const ownerId = await createUser();
  const diagram = await diagrams.create({ title: "D", ownerId });
  const scene = await scenes.create({
    diagramId: diagram.id,
    name: "Scene 1",
    sortOrder: 0,
    elements,
  });
  return { diagram, scene };
}

async function elementIds(sceneId: string): Promise<string[]> {
  const scene = await scenes.findById(sceneId);
  return (scene?.elements as { id: string }[]).map((e) => e.id).sort((a, b) => a.localeCompare(b));
}

describe("PgSceneRepository.updateSceneMerged", () => {
  it("keeps every element when saves on one scene run concurrently", async () => {
    const { diagram, scene } = await sceneWith([element("base")]);
    const ids = Array.from({ length: 8 }, (_, i) => `save-${i}`);

    const results = await Promise.all(
      ids.map((id) => scenes.updateSceneMerged(scene.id, diagram.id, [element(id)], {})),
    );

    assert.ok(results.every(Boolean));
    assert.deepEqual(
      await elementIds(scene.id),
      ["base", ...ids].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("merges into the row as committed by the transaction it waited for", async () => {
    const { diagram, scene } = await sceneWith([element("base")]);
    const other = new Client({ connectionString: config.databaseUrl });
    await other.connect();
    try {
      await other.query("BEGIN");
      await other.query("UPDATE scenes SET elements = $1 WHERE id = $2", [
        JSON.stringify([element("base"), element("concurrent")]),
        scene.id,
      ]);

      const save = scenes.updateSceneMerged(scene.id, diagram.id, [element("incoming")], {});
      await waitForLockWaiter();
      await other.query("COMMIT");

      assert.equal(await save, true);
    } finally {
      await other.end();
    }

    assert.deepEqual(await elementIds(scene.id), ["base", "concurrent", "incoming"]);
  });

  it("refuses a scene of another diagram and leaves it unchanged", async () => {
    const { scene } = await sceneWith([element("base")]);
    const other = await diagrams.create({ title: "Other", ownerId: await createUser() });
    const before = await scenes.findById(scene.id);

    const saved = await scenes.updateSceneMerged(scene.id, other.id, [element("intruder")], {
      theme: "dark",
    });

    assert.equal(saved, false);
    assert.deepEqual(await scenes.findById(scene.id), before);
  });
});
