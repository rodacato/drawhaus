import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import msgpackParser from "socket.io-msgpack-parser";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import { SocketIoRealtimeNotifier } from "../../infrastructure/socket/realtime-notifier";
import type { CommentThread } from "../../domain/entities/comment";

const ROOM = "11111111-1111-4111-8111-111111111111";
const OTHER_ROOM = "22222222-2222-4222-8222-222222222222";
const ELEMENTS = [{ id: "kept", type: "rectangle", version: 4 }];

function thread(): CommentThread {
  return {
    id: "thread-1",
    diagramId: ROOM,
    sceneId: "scene-1",
    elementId: "kept",
    authorId: "user-1",
    authorName: "Ada",
    body: "why this arrow?",
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date("2026-01-02T03:04:05.000Z"),
    updatedAt: new Date("2026-01-02T03:04:05.000Z"),
    replies: [],
    likeCount: 0,
    likedByMe: false,
  };
}

let httpServer: HttpServer;
let io: Server;
let inRoom: ClientSocket;
let elsewhere: ClientSocket;

function connectTo(port: number, room: string): Promise<ClientSocket> {
  const client = connect(`http://127.0.0.1:${port}`, { parser: msgpackParser, auth: { room } });
  return new Promise((resolve, reject) => {
    client.on("connect", () => resolve(client));
    client.on("connect_error", reject);
  });
}

function nextEvent(client: ClientSocket, event: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), 2000);
    client.once(event, (payload: unknown) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function record(client: ClientSocket, events: string[]): string[] {
  const seen: string[] = [];
  for (const event of events) client.on(event, () => seen.push(event));
  return seen;
}

before(async () => {
  httpServer = createServer();
  io = new Server(httpServer, { parser: msgpackParser });
  io.on("connection", (socket) => socket.join(String(socket.handshake.auth.room)));
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));

  const { port } = httpServer.address() as AddressInfo;
  [inRoom, elsewhere] = await Promise.all([connectTo(port, ROOM), connectTo(port, OTHER_ROOM)]);
});

after(async () => {
  inRoom.close();
  elsewhere.close();
  await io.close();
});

describe("SocketIoRealtimeNotifier", () => {
  let notifier: SocketIoRealtimeNotifier;

  beforeEach(() => {
    notifier = new SocketIoRealtimeNotifier();
    notifier.attach(io);
  });

  it("delivers a replaced scene to the room as scene-from-db", async () => {
    const received = nextEvent(inRoom, "scene-from-db");

    notifier.sceneReplaced({
      diagramId: ROOM,
      sceneId: "scene-1",
      revision: 7,
      elements: ELEMENTS,
      appState: { theme: "dark" },
    });

    assert.deepEqual(await received, {
      elements: ELEMENTS,
      appState: { theme: "dark" },
      activeSceneId: "scene-1",
      revision: 7,
    });
  });

  it("does not deliver it to a client in another diagram's room", async () => {
    const strayEvents = record(elsewhere, ["scene-from-db"]);
    const delivered = nextEvent(inRoom, "scene-from-db");

    notifier.sceneReplaced({
      diagramId: ROOM,
      sceneId: "scene-1",
      revision: 8,
      elements: [],
      appState: {},
    });
    await delivered;

    // Delivery on one socket is ordered, so a stray broadcast would land before this marker.
    const marker = nextEvent(elsewhere, "marker");
    io.to(OTHER_ROOM).emit("marker");
    await marker;

    assert.deepEqual(strayEvents, []);
  });

  it("delivers a restore as the three events a board needs", async () => {
    const order = record(inRoom, ["snapshot-restored", "scene-from-db", "snapshot-created"]);
    const last = nextEvent(inRoom, "snapshot-created");

    notifier.snapshotRestored({
      diagramId: ROOM,
      snapshotId: "snap-1",
      restoredBy: { userId: "user-1", userName: "Ada" },
      scene: { sceneId: "scene-1", revision: 9, elements: ELEMENTS, appState: {} },
    });

    await last;
    assert.deepEqual(order, ["snapshot-restored", "scene-from-db", "snapshot-created"]);
  });

  it("serializes a comment thread's dates the way the REST responses do", async () => {
    const received = nextEvent(inRoom, "comment-created");

    notifier.commentChanged({ kind: "created", diagramId: ROOM, thread: thread() });

    assert.deepEqual(await received, {
      roomId: ROOM,
      thread: {
        id: "thread-1",
        diagramId: ROOM,
        sceneId: "scene-1",
        elementId: "kept",
        authorId: "user-1",
        authorName: "Ada",
        body: "why this arrow?",
        resolved: false,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
        replies: [],
        likeCount: 0,
        likedByMe: false,
      },
    });
  });

  it("drops notifications raised before the io server exists, without throwing", async () => {
    const detached = new SocketIoRealtimeNotifier();
    const strayEvents = record(inRoom, ["scene-from-db"]);

    detached.sceneReplaced({
      diagramId: ROOM,
      sceneId: "scene-1",
      revision: 1,
      elements: ELEMENTS,
      appState: {},
    });

    const delivered = nextEvent(inRoom, "scene-from-db");
    notifier.sceneReplaced({
      diagramId: ROOM,
      sceneId: "scene-1",
      revision: 2,
      elements: [],
      appState: {},
    });
    await delivered;

    assert.deepEqual(strayEvents, ["scene-from-db"], "only the attached notifier's event arrived");
  });
});
