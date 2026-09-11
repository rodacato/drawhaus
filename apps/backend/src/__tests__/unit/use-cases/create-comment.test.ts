import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateCommentUseCase } from "../../../application/use-cases/comments/create-comment";
import { InMemoryCommentRepository } from "../../fakes/in-memory-comment-repository";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { NotFoundError } from "../../../domain/errors";

async function setup() {
  const users = new InMemoryUserRepository();
  const comments = new InMemoryCommentRepository(() => users.store);
  const diagrams = new InMemoryDiagramRepository();
  const scenes = new InMemorySceneRepository();

  const user = await users.create({ email: "a@test.com", name: "A", passwordHash: "h" });
  const own = await diagrams.create({ title: "Mine", ownerId: user.id });
  const foreign = await diagrams.create({ title: "Theirs", ownerId: "someone-else" });
  const ownScene = await scenes.create({ diagramId: own.id, name: "Scene 1", sortOrder: 0 });
  const foreignScene = await scenes.create({
    diagramId: foreign.id,
    name: "Scene 1",
    sortOrder: 0,
  });

  return {
    createComment: new CreateCommentUseCase(comments, diagrams, scenes),
    comments,
    user,
    own,
    ownScene,
    foreignScene,
  };
}

describe("CreateCommentUseCase", () => {
  it("attaches the thread to a scene of the same diagram", async () => {
    const { createComment, user, own, ownScene } = await setup();

    const thread = await createComment.execute(own.id, user.id, "el1", "hello", ownScene.id);

    assert.equal(thread.sceneId, ownScene.id);
  });

  it("creates a thread without a scene", async () => {
    const { createComment, user, own } = await setup();

    const thread = await createComment.execute(own.id, user.id, "el1", "hello", null);

    assert.equal(thread.sceneId, null);
  });

  it("rejects a scene of another diagram and creates nothing", async () => {
    const { createComment, comments, user, own, foreignScene } = await setup();

    await assert.rejects(
      () => createComment.execute(own.id, user.id, "el1", "hello", foreignScene.id),
      (err: unknown) => err instanceof NotFoundError,
    );

    assert.deepEqual(await comments.findByDiagram(own.id), []);
  });
});
