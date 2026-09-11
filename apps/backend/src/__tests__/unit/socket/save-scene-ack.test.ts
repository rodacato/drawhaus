import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server, type Socket } from "socket.io";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import msgpackParser from "socket.io-msgpack-parser";
import { registerSceneHandlers } from "../../../infrastructure/socket/handlers/scene.handler";
import { SaveSceneUseCase } from "../../../application/use-cases/realtime/save-scene";
import { CreateSnapshotUseCase } from "../../../application/use-cases/snapshots/create-snapshot";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";
import { InMemorySnapshotRepository } from "../../fakes/in-memory-snapshot-repository";

const ACK_TIMEOUT_MS = 2000;

type Role = "owner" | "editor" | "viewer";
type Ack = { ok: boolean; reason?: string; sceneId?: string };
type AckResult = { timedOut: boolean; response?: Ack };

let httpServer: HttpServer;
let io: Server;
let url: string;
let scenes: InMemorySceneRepository;
let diagrams: InMemoryDiagramRepository;
/** Applied to every socket as it connects — each test decides the role and room it joins with. */
let onConnection: (socket: Socket) => void = () => {};

before(async () => {
  scenes = new InMemorySceneRepository();
  diagrams = new InMemoryDiagramRepository();
  const snapshots = new InMemorySnapshotRepository();
  httpServer = createServer();
  io = new Server(httpServer, { parser: msgpackParser });
  io.on("connection", (socket) => {
    socket.data.roomRoles = {};
    socket.data.isGuest = false;
    onConnection(socket);
    registerSceneHandlers(io, socket, {
      saveScene: new SaveSceneUseCase(scenes),
      createSnapshot: new CreateSnapshotUseCase(snapshots, scenes, diagrams),
    });
  });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

after(async () => {
  await io.close();
});

async function board(role: Role | null) {
  const owner = crypto.randomUUID();
  const diagram = await diagrams.create({ title: "Board", ownerId: owner });
  const scene = await scenes.create({ diagramId: diagram.id, name: "Scene 1", sortOrder: 0 });
  onConnection = (socket) => {
    socket.data.userId = owner;
    socket.data.userName = "Owner";
    if (!role) return;
    socket.data.roomRoles = { [diagram.id]: role };
    socket.join(diagram.id);
  };
  return { roomId: diagram.id, sceneId: scene.id };
}

const clients: ClientSocket[] = [];

async function client(): Promise<ClientSocket> {
  const socket = connect(url, {
    parser: msgpackParser,
    transports: ["websocket"],
    forceNew: true,
  });
  clients.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  return socket;
}

after(() => clients.forEach((socket) => socket.close()));

function save(socket: ClientSocket, payload: Record<string, unknown>): Promise<AckResult> {
  return new Promise((resolve) => {
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit("save-scene", payload, (timedOut: unknown, response: Ack) =>
        resolve(timedOut ? { timedOut: true } : { timedOut: false, response }),
      );
  });
}

function received(socket: ClientSocket, event: string, ms = 300): Promise<unknown | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (payload: unknown) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe("save-scene acknowledgement", () => {
  it("confirms a save that persisted", async () => {
    const { roomId, sceneId } = await board("owner");
    const socket = await client();

    const { response } = await save(socket, {
      roomId,
      sceneId,
      elements: [{ id: "el1", version: 1 }],
      appState: {},
    });

    assert.deepEqual(response, { ok: true, sceneId });
    const stored = await scenes.findById(sceneId);
    assert.deepEqual(
      (stored!.elements as { id: string }[]).map((e) => e.id),
      ["el1"],
    );
  });

  it("refuses a save from a socket that never joined the room", async () => {
    const { roomId, sceneId } = await board(null);
    const socket = await client();

    const { response } = await save(socket, { roomId, sceneId, elements: [], appState: {} });

    assert.deepEqual(response, { ok: false, reason: "not-in-room" });
    assert.deepEqual((await scenes.findById(sceneId))!.elements, []);
  });

  it("refuses a viewer's save", async () => {
    const { roomId, sceneId } = await board("viewer");
    const socket = await client();

    const { response } = await save(socket, {
      roomId,
      sceneId,
      elements: [{ id: "evil", version: 1 }],
      appState: {},
    });

    assert.deepEqual(response, { ok: false, reason: "forbidden" });
    assert.deepEqual((await scenes.findById(sceneId))!.elements, []);
  });

  it("refuses a save that names no scene and has no active one", async () => {
    const { roomId } = await board("editor");
    const socket = await client();

    const { response } = await save(socket, { roomId, sceneId: null, elements: [], appState: {} });

    assert.deepEqual(response, { ok: false, reason: "no-scene" });
  });

  it("refuses a save computed before the scene was replaced, and sends the current scene", async () => {
    const { roomId, sceneId } = await board("owner");
    const socket = await client();
    await scenes.updateScene(sceneId, [{ id: "restored", version: 1 }], {});

    const fromDb = received(socket, "scene-from-db");
    const { response } = await save(socket, {
      roomId,
      sceneId,
      elements: [{ id: "edited-before-restore", version: 1 }],
      appState: {},
      revision: 0,
    });

    assert.deepEqual(response, { ok: false, reason: "stale" });
    assert.equal(((await fromDb) as { revision: number } | null)?.revision, 1);
    assert.deepEqual((await scenes.findById(sceneId))!.elements, [{ id: "restored", version: 1 }]);
  });

  it("answers a failed save on the ack instead of room-error", async () => {
    const { roomId } = await board("owner");
    const socket = await client();
    const foreign = await scenes.create({
      diagramId: "another-diagram",
      name: "Scene 1",
      sortOrder: 0,
    });

    const roomError = received(socket, "room-error");
    const { response } = await save(socket, {
      roomId,
      sceneId: foreign.id,
      elements: [{ id: "evil", version: 1 }],
      appState: {},
    });

    assert.deepEqual(response, { ok: false, reason: "server-error" });
    assert.equal(await roomError, null);
    assert.deepEqual((await scenes.findById(foreign.id))!.elements, []);
  });

  it("answers a payload the schema rejects without running the handler", async () => {
    const { roomId } = await board("owner");
    const socket = await client();

    const eventError = received(socket, "event-error");
    const { response } = await save(socket, { roomId, elements: "not-an-array" });

    assert.deepEqual(response, { ok: false, reason: "invalid-payload" });
    assert.deepEqual(await eventError, { event: "save-scene", message: "Invalid payload" });
  });

  it("still saves for a client that sends no acknowledgement callback", async () => {
    const { roomId, sceneId } = await board("owner");
    const socket = await client();

    const confirmed = received(socket, "scene-saved");
    socket.emit("save-scene", {
      roomId,
      sceneId,
      elements: [{ id: "legacy", version: 1 }],
      appState: {},
    });

    assert.deepEqual(await confirmed, { roomId, sceneId });
    assert.deepEqual(
      ((await scenes.findById(sceneId))!.elements as { id: string }[]).map((e) => e.id),
      ["legacy"],
    );
  });

  it("relays a delta from a handler that acknowledges nothing", async () => {
    const { roomId } = await board("owner");
    const sender = await client();
    const peer = await client();

    const relayed = received(peer, "scene-delta-received");
    sender.emit("scene-delta", {
      roomId,
      changed: [{ id: "a", version: 2 }],
      removedIds: [],
    });

    assert.deepEqual(((await relayed) as { changed: unknown[] } | null)?.changed, [
      { id: "a", version: 2 },
    ]);
  });
});
