import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Server } from "socket.io";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import msgpackParser from "socket.io-msgpack-parser";
import { setupSocketServer } from "../../../infrastructure/socket";
import { MAX_PAYLOAD_BYTES } from "../../../infrastructure/payload-limit";

let httpServer: HttpServer;
let io: Server;
let url: string;
const clients: ClientSocket[] = [];

before(async () => {
  httpServer = createServer();
  const unused = {} as never;
  io = await setupSocketServer(httpServer, {
    authenticateSocket: {
      execute: async () => ({ via: "share-link", shareToken: "t" }),
    } as never,
    joinRoom: unused,
    joinRoomGuest: unused,
    saveScene: unused,
    syncToDrive: unused,
    createComment: unused,
    replyComment: unused,
    resolveComment: unused,
    deleteComment: unused,
    createSnapshot: unused,
  });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

after(async () => {
  clients.forEach((socket) => socket.close());
  await io.close();
});

async function client(): Promise<ClientSocket> {
  const socket = connect(url, {
    parser: msgpackParser,
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });
  clients.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  return socket;
}

function sceneOfAbout(bytes: number): unknown[] {
  return [{ id: "e1", type: "freedraw", points: "x".repeat(bytes) }];
}

describe("socket payload limit", () => {
  it("accepts a scene larger than 1 MB, as the REST limit does", async () => {
    const socket = await client();

    const ack = await socket
      .timeout(5000)
      .emitWithAck("save-scene", {
        roomId: "r",
        elements: sceneOfAbout(2 * 1024 * 1024),
        appState: {},
      });

    assert.deepEqual(ack, { ok: false, reason: "not-in-room" });
    assert.equal(socket.connected, true);
  });

  it("still drops a payload above the shared limit", async () => {
    const socket = await client();
    const closed = new Promise<void>((resolve) => socket.once("disconnect", () => resolve()));

    socket.emit("save-scene", {
      roomId: "r",
      elements: sceneOfAbout(MAX_PAYLOAD_BYTES + 1024),
      appState: {},
    });

    await closed;
    assert.equal(socket.connected, false);
  });
});
