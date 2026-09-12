import { describe, it, before, after, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import msgpackParser from "socket.io-msgpack-parser";
import { z } from "zod";
import {
  EVENT_ERROR,
  RATE_LIMIT_MAX_INVALID,
  onEvent,
} from "../../../infrastructure/socket/helpers";
import { logger } from "../../../infrastructure/logger";

type Ack = { ok: boolean; reason?: string; n?: number };

const WINDOW_ELAPSED_MS = 1100;

let httpServer: HttpServer;
let io: Server;
let url: string;
const clients: ClientSocket[] = [];

before(async () => {
  httpServer = createServer();
  io = new Server(httpServer, { parser: msgpackParser });
  io.on("connection", (socket) => {
    onEvent(socket, "probe", z.object({ n: z.number() }), ({ n }, ack) => ack?.({ ok: true, n }));
  });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

after(async () => {
  clients.forEach((socket) => socket.close());
  await io.close();
});

afterEach(() => mock.restoreAll());

async function client(): Promise<ClientSocket> {
  const socket = connect(url, { parser: msgpackParser, transports: ["websocket"], forceNew: true });
  clients.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  return socket;
}

function probe(socket: ClientSocket, payload: unknown): Promise<Ack> {
  return socket.timeout(2000).emitWithAck("probe", payload);
}

function countEventErrors(socket: ClientSocket): () => number {
  let count = 0;
  socket.on(EVENT_ERROR, () => (count += 1));
  return () => count;
}

function captureWarnings(): string[] {
  const messages: string[] = [];
  mock.method(logger, "warn", (_fields: unknown, message: string) => messages.push(message));
  return messages;
}

async function sendInvalid(socket: ClientSocket, times: number): Promise<Ack[]> {
  return Promise.all(Array.from({ length: times }, () => probe(socket, { n: "nope" })));
}

describe("invalid socket payloads are rate limited", () => {
  it("reports and logs each invalid payload up to the limit", async () => {
    const socket = await client();
    const eventErrors = countEventErrors(socket);
    const warnings = captureWarnings();

    const acks = await sendInvalid(socket, RATE_LIMIT_MAX_INVALID);

    assert.equal(eventErrors(), RATE_LIMIT_MAX_INVALID);
    assert.deepEqual(warnings, Array(RATE_LIMIT_MAX_INVALID).fill("socket payload rejected"));
    assert.ok(acks.every((ack) => ack.ok === false && ack.reason === "invalid-payload"));
  });

  it("beyond the limit logs once for the window and sends no more event-error", async () => {
    const socket = await client();
    const eventErrors = countEventErrors(socket);
    const warnings = captureWarnings();

    await sendInvalid(socket, RATE_LIMIT_MAX_INVALID * 5);

    assert.equal(eventErrors(), RATE_LIMIT_MAX_INVALID);
    assert.equal(warnings.length, RATE_LIMIT_MAX_INVALID + 1);
    assert.match(warnings.at(-1)!, /over limit/);
  });

  it("still answers the acknowledgement of a payload dropped over the limit", async () => {
    const socket = await client();
    captureWarnings();

    const acks = await sendInvalid(socket, RATE_LIMIT_MAX_INVALID + 3);

    assert.deepEqual(acks.slice(RATE_LIMIT_MAX_INVALID), [
      { ok: false, reason: "invalid-payload" },
      { ok: false, reason: "invalid-payload" },
      { ok: false, reason: "invalid-payload" },
    ]);
  });

  it("does not throttle valid payloads on a socket over its invalid limit", async () => {
    const socket = await client();
    captureWarnings();
    await sendInvalid(socket, RATE_LIMIT_MAX_INVALID * 2);

    assert.deepEqual(await probe(socket, { n: 7 }), { ok: true, n: 7 });
  });

  it("limits each socket on its own", async () => {
    const noisy = await client();
    const quiet = await client();
    const quietErrors = countEventErrors(quiet);
    captureWarnings();
    await sendInvalid(noisy, RATE_LIMIT_MAX_INVALID * 2);

    await sendInvalid(quiet, 1);

    assert.equal(quietErrors(), 1);
  });

  it("reports invalid payloads again once the window has passed", async () => {
    const socket = await client();
    const eventErrors = countEventErrors(socket);
    captureWarnings();
    await sendInvalid(socket, RATE_LIMIT_MAX_INVALID * 2);
    assert.equal(eventErrors(), RATE_LIMIT_MAX_INVALID);

    await sleep(WINDOW_ELAPSED_MS);
    await sendInvalid(socket, 1);

    assert.equal(eventErrors(), RATE_LIMIT_MAX_INVALID + 1);
  });
});
