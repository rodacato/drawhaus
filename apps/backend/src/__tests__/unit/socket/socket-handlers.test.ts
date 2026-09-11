import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { EVENT_ERROR, onEvent } from "../../../infrastructure/socket/helpers";
import { registerRoomHandlers } from "../../../infrastructure/socket/handlers/room.handler";
import { registerSceneHandlers } from "../../../infrastructure/socket/handlers/scene.handler";
import { registerLockHandlers } from "../../../infrastructure/socket/handlers/lock.handler";
import { registerCursorHandlers } from "../../../infrastructure/socket/handlers/cursor.handler";
import { registerCommentHandlers } from "../../../infrastructure/socket/handlers/comment.handler";
import { JoinRoomUseCase } from "../../../application/use-cases/realtime/join-room";
import { JoinRoomGuestUseCase } from "../../../application/use-cases/realtime/join-room-guest";
import { SaveSceneUseCase } from "../../../application/use-cases/realtime/save-scene";
import { CreateSnapshotUseCase } from "../../../application/use-cases/snapshots/create-snapshot";
import { CreateCommentUseCase } from "../../../application/use-cases/comments/create-comment";
import { ReplyCommentUseCase } from "../../../application/use-cases/comments/reply-comment";
import { ResolveCommentUseCase } from "../../../application/use-cases/comments/resolve-comment";
import { DeleteCommentUseCase } from "../../../application/use-cases/comments/delete-comment";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";
import { InMemoryCommentRepository } from "../../fakes/in-memory-comment-repository";
import { InMemoryShareRepository } from "../../fakes/in-memory-share-repository";
import { InMemorySnapshotRepository } from "../../fakes/in-memory-snapshot-repository";
import { FakeIo, FakeSocket } from "../../fakes/fake-socket";

const CLIENT_EVENTS = [
  "join-room",
  "join-room-guest",
  "scene-update",
  "scene-delta",
  "save-scene",
  "request-edit-lock",
  "release-edit-lock",
  "raise-hand",
  "lower-hand",
  "cursor-move",
  "viewport-update",
  "request-viewport",
  "comment-create",
  "comment-reply",
  "comment-resolve",
  "comment-delete",
].sort((a, b) => a.localeCompare(b));

const MALFORMED: unknown[] = [undefined, null, 42, "room", [], {}, { roomId: 123 }];

function setup() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const diagrams = new InMemoryDiagramRepository();
  const scenes = new InMemorySceneRepository();
  const comments = new InMemoryCommentRepository(() => users.store);
  const createSnapshot = new CreateSnapshotUseCase(
    new InMemorySnapshotRepository(),
    scenes,
    diagrams,
  );

  const socket = new FakeSocket();
  const io = new FakeIo([socket]);
  const server = io.asServer();
  const client = socket.asSocket();

  registerRoomHandlers(server, client, {
    joinRoom: new JoinRoomUseCase(sessions, diagrams, scenes),
    joinRoomGuest: new JoinRoomGuestUseCase(new InMemoryShareRepository(), diagrams, scenes),
    createSnapshot,
  });
  registerSceneHandlers(server, client, {
    saveScene: new SaveSceneUseCase(scenes),
    createSnapshot,
  });
  registerLockHandlers(server, client);
  registerCursorHandlers(client, server);
  registerCommentHandlers(server, client, {
    createComment: new CreateCommentUseCase(comments, diagrams, scenes),
    replyComment: new ReplyCommentUseCase(comments, diagrams),
    resolveComment: new ResolveCommentUseCase(comments, diagrams),
    deleteComment: new DeleteCommentUseCase(comments, diagrams),
  });

  return { socket, io, users, sessions, diagrams, scenes };
}

async function joinAsOwner(h: ReturnType<typeof setup>) {
  const user = await h.users.create({ email: "owner@test.com", name: "Owner", passwordHash: "h" });
  const session = await h.sessions.create(user.id);
  const diagram = await h.diagrams.create({ title: "Board", ownerId: user.id });
  h.socket.handshake.headers.cookie = `drawhaus_session=${session.token}`;
  await h.socket.receive("join-room", { roomId: diagram.id });
  const [scene] = await h.scenes.findByDiagram(diagram.id);
  h.socket.emitted = [];
  return { user, diagram, scene };
}

function eventsNamed(list: { event: string }[], name: string) {
  return list.filter((e) => e.event === name);
}

describe("socket handlers — malformed payloads", () => {
  it("registers every client event through the validating wrapper", () => {
    const { socket } = setup();
    const registered = socket
      .events()
      .filter((e) => e !== "disconnecting")
      .sort((a, b) => a.localeCompare(b));
    assert.deepEqual(registered, CLIENT_EVENTS);
  });

  it("never throws and answers with event-error instead of room-error", async () => {
    const { socket } = setup();
    for (const event of CLIENT_EVENTS) {
      for (const payload of MALFORMED) {
        socket.emitted = [];
        await assert.doesNotReject(
          socket.receive(event, payload),
          `${event} <- ${String(payload)}`,
        );
        assert.deepEqual(socket.emitted, [
          { event: EVENT_ERROR, payload: { event, message: "Invalid payload" } },
        ]);
      }
    }
  });

  it("drops a scene-delta whose changed list holds a non-object", async () => {
    const h = setup();
    const { diagram } = await joinAsOwner(h);

    await assert.doesNotReject(
      h.socket.receive("scene-delta", { roomId: diagram.id, changed: [null], removedIds: [] }),
    );

    assert.equal(eventsNamed(h.socket.broadcasts, "scene-delta-received").length, 0);
    assert.equal(eventsNamed(h.socket.emitted, EVENT_ERROR).length, 1);
  });

  it("contains exceptions a handler throws synchronously or asynchronously", async () => {
    const socket = new FakeSocket();
    onEvent(socket.asSocket(), "boom-sync", z.object({}), () => {
      throw new Error("sync");
    });
    onEvent(socket.asSocket(), "boom-async", z.object({}), async () => {
      throw new Error("async");
    });

    await assert.doesNotReject(socket.receive("boom-sync", {}));
    await assert.doesNotReject(socket.receive("boom-async", {}));
  });

  it("survives a presence lookup failure while disconnecting", async () => {
    const h = setup();
    await joinAsOwner(h);
    h.io.failFetch = true;

    await assert.doesNotReject(h.socket.receive("disconnecting", "transport close"));
  });
});

describe("socket handlers — valid payloads keep their behavior", () => {
  it("join-room with a valid session joins the room and its first scene", async () => {
    const h = setup();
    const { diagram, scene } = await joinAsOwner(h);

    assert.ok(h.socket.rooms.has(diagram.id));
    assert.ok(h.socket.rooms.has(`${diagram.id}:${scene.id}`));
    assert.equal(h.socket.data.activeSceneId, scene.id);
  });

  it("join-room with an unknown session still reports room-error", async () => {
    const h = setup();
    const diagram = await h.diagrams.create({ title: "Board", ownerId: "someone" });
    h.socket.handshake.headers.cookie = "drawhaus_session=unknown";

    await h.socket.receive("join-room", { roomId: diagram.id });

    assert.deepEqual(h.socket.emitted, [
      { event: "room-error", payload: { message: "Join failed" } },
    ]);
  });

  it("cursor-move is relayed for a joined room and dropped for any other", async () => {
    const h = setup();
    const { user, diagram } = await joinAsOwner(h);

    await h.socket.receive("cursor-move", { roomId: diagram.id, x: 1, y: 2 });
    await h.socket.receive("cursor-move", { roomId: "not-joined", x: 3, y: 4 });

    assert.deepEqual(eventsNamed(h.socket.broadcasts, "cursor-moved"), [
      {
        room: diagram.id,
        event: "cursor-moved",
        payload: { userId: user.id, name: "Owner", x: 1, y: 2 },
      },
    ]);
  });

  it("save-scene without sceneId persists the active scene and confirms", async () => {
    const h = setup();
    const { diagram, scene } = await joinAsOwner(h);

    await h.socket.receive("save-scene", {
      roomId: diagram.id,
      sceneId: null,
      elements: [{ id: "el1", version: 1 }],
      appState: { zoom: 1 },
    });

    const saved = await h.scenes.findById(scene.id);
    assert.deepEqual(
      (saved!.elements as { id: string }[]).map((e) => e.id),
      ["el1"],
    );
    assert.deepEqual(eventsNamed(h.socket.emitted, "scene-saved"), [
      { event: "scene-saved", payload: { roomId: diagram.id, sceneId: scene.id } },
    ]);
  });
});

describe("socket handlers — scene binding", () => {
  it("save-scene with another diagram's sceneId persists nothing", async () => {
    const h = setup();
    const { diagram } = await joinAsOwner(h);
    const victim = await h.scenes.create({
      diagramId: "victim-diagram",
      name: "Scene 1",
      sortOrder: 0,
      elements: [{ id: "keep", version: 1 }],
    });

    await h.socket.receive("save-scene", {
      roomId: diagram.id,
      sceneId: victim.id,
      elements: [{ id: "evil", version: 1 }],
      appState: {},
    });

    const untouched = await h.scenes.findById(victim.id);
    assert.deepEqual(untouched!.elements, [{ id: "keep", version: 1 }]);
    assert.equal(eventsNamed(h.socket.emitted, "scene-saved").length, 0);
    assert.deepEqual(eventsNamed(h.socket.emitted, "room-error"), [
      { event: "room-error", payload: { message: "Save failed" } },
    ]);
  });
});
