import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Client } from "pg";
import { config } from "../../infrastructure/config";
import { pool } from "../../infrastructure/db";
import { PgDiagramRepository } from "../../infrastructure/persistence/pg-diagram-repository";
import { PgFolderRepository } from "../../infrastructure/persistence/pg-folder-repository";
import { PgSceneRepository } from "../../infrastructure/persistence/pg-scene-repository";
import { addDiagramMember, countRows, createUser, waitForLockWaiter } from "./fixtures";
import { useTestDatabase } from "./test-database";

useTestDatabase();

const diagrams = new PgDiagramRepository();
const scenes = new PgSceneRepository();
const folders = new PgFolderRepository();

const element = (id: string) => ({ id, version: 1 });

async function diagramWithRowContent() {
  return diagrams.create({
    title: "D",
    ownerId: await createUser(),
    elements: [element("from-row")],
    appState: { viewBackgroundColor: "#fafafa" },
  });
}

describe("PgDiagramRepository.update (ADR-025)", () => {
  it("creates one scene for a content update, seeded from the row, and mirrors it on the row", async () => {
    const diagram = await diagramWithRowContent();

    const updated = await diagrams.update(diagram.id, { elements: [element("from-api")] });

    const created = await scenes.findByDiagram(diagram.id);
    assert.equal(created.length, 1);
    const [scene] = created;
    assert.equal(scene.name, "Scene 1");
    assert.deepEqual(scene.elements, [element("from-api")]);
    assert.deepEqual(scene.appState, { viewBackgroundColor: "#fafafa" });
    const row = await diagrams.findById(diagram.id);
    assert.deepEqual(row?.elements, scene.elements);
    assert.deepEqual(row?.appState, scene.appState);
    assert.deepEqual(updated?.elements, scene.elements);
  });

  it("moves the scene to a new revision on a content update, but not on a title-only one", async () => {
    const diagram = await diagramWithRowContent();
    await diagrams.update(diagram.id, { elements: [element("from-api")] });
    const [created] = await scenes.findByDiagram(diagram.id);

    await diagrams.update(diagram.id, { elements: [element("replaced")] });
    const [afterContent] = await scenes.findByDiagram(diagram.id);
    await diagrams.update(diagram.id, { title: "Renamed" });
    const [afterTitle] = await scenes.findByDiagram(diagram.id);

    assert.equal(created.revision, 0, "the first content update creates the scene, not replaces");
    assert.equal(afterContent.revision, 1);
    assert.equal(afterTitle.revision, 1);
  });

  it("waits for a concurrent content update and writes the scene it created", async () => {
    const diagram = await diagramWithRowContent();
    const firstWriter = new Client({ connectionString: config.databaseUrl });
    await firstWriter.connect();
    try {
      await firstWriter.query("BEGIN");
      await firstWriter.query("SELECT 1 FROM diagrams WHERE id = $1 FOR NO KEY UPDATE", [
        diagram.id,
      ]);
      await firstWriter.query(
        "INSERT INTO scenes (diagram_id, name, sort_order, elements) VALUES ($1, 'Scene 1', 0, $2)",
        [diagram.id, JSON.stringify([element("first-writer")])],
      );

      const secondWrite = diagrams.update(diagram.id, { elements: [element("second-writer")] });
      await waitForLockWaiter();
      await firstWriter.query("COMMIT");
      await secondWrite;
    } finally {
      await firstWriter.end();
    }

    const created = await scenes.findByDiagram(diagram.id);
    assert.equal(created.length, 1);
    assert.deepEqual(created[0].elements, [element("second-writer")]);
  });

  it("writes the first scene only, keeping the fields it was not given", async () => {
    const diagram = await diagramWithRowContent();
    const first = await scenes.create({
      diagramId: diagram.id,
      name: "First",
      sortOrder: 0,
      elements: [element("old")],
      appState: { zoom: 2 },
    });
    const second = await scenes.create({
      diagramId: diagram.id,
      name: "Second",
      sortOrder: 1,
      elements: [element("untouched")],
    });

    await diagrams.update(diagram.id, { elements: [element("new")] });

    const firstAfter = await scenes.findById(first.id);
    assert.deepEqual(firstAfter?.elements, [element("new")]);
    assert.deepEqual(firstAfter?.appState, { zoom: 2 });
    assert.deepEqual(await scenes.findById(second.id), second);
    assert.deepEqual((await diagrams.findById(diagram.id))?.appState, { zoom: 2 });
  });

  it("neither creates nor touches a scene on a title-only update", async () => {
    const withoutScene = await diagramWithRowContent();
    const withScene = await diagramWithRowContent();
    const scene = await scenes.create({
      diagramId: withScene.id,
      name: "Scene 1",
      sortOrder: 0,
      elements: [element("on-board")],
    });

    await diagrams.update(withoutScene.id, { title: "Renamed" });
    await diagrams.update(withScene.id, { title: "Renamed" });

    assert.deepEqual(await scenes.findByDiagram(withoutScene.id), []);
    assert.deepEqual(await scenes.findById(scene.id), scene);
    assert.equal((await diagrams.findById(withScene.id))?.title, "Renamed");
  });

  it("returns null and creates no scene for an unknown diagram", async () => {
    assert.equal(await diagrams.update(crypto.randomUUID(), { elements: [element("x")] }), null);
    assert.equal(await countRows("scenes"), 0);
  });
});

describe("PgDiagramRepository.findByUser outside a workspace", () => {
  for (const inFolder of [true, false]) {
    it(`lists ${inFolder ? "a folder" : "the root"} most recently updated first, each diagram once`, async () => {
      const owner = await createUser();
      const folderId = inFolder ? (await folders.create({ ownerId: owner, name: "F" })).id : null;
      const newestFirst: string[] = [];
      for (const title of ["a", "b", "c"]) {
        newestFirst.push((await diagrams.create({ title, ownerId: owner, folderId })).id);
      }
      // Newest gets the highest id, so a listing ordered by id cannot pass by chance.
      newestFirst.sort((x, y) => (x < y ? 1 : -1));
      for (const [daysAgo, id] of newestFirst.entries()) {
        await pool.query(
          "UPDATE diagrams SET updated_at = now() - make_interval(days => $2) WHERE id = $1",
          [id, daysAgo],
        );
      }
      await addDiagramMember(newestFirst[0], await createUser(), "viewer");
      await addDiagramMember(newestFirst[0], await createUser(), "editor");

      const listed = await diagrams.findByUser(owner, folderId);

      assert.deepEqual(
        listed.map((d) => d.id),
        newestFirst,
      );
    });
  }
});
