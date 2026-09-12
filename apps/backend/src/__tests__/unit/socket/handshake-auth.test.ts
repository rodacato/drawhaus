import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Server } from "socket.io";
import { io as connect, type Socket as ClientSocket, type ManagerOptions } from "socket.io-client";
import msgpackParser from "socket.io-msgpack-parser";
import { setupSocketServer } from "../../../infrastructure/socket";
import { AuthenticateSocketUseCase } from "../../../application/use-cases/realtime/authenticate-socket";
import { JoinRoomUseCase } from "../../../application/use-cases/realtime/join-room";
import { JoinRoomGuestUseCase } from "../../../application/use-cases/realtime/join-room-guest";
import { SaveSceneUseCase } from "../../../application/use-cases/realtime/save-scene";
import { CreateSnapshotUseCase } from "../../../application/use-cases/snapshots/create-snapshot";
import { CreateCommentUseCase } from "../../../application/use-cases/comments/create-comment";
import { ReplyCommentUseCase } from "../../../application/use-cases/comments/reply-comment";
import { ResolveCommentUseCase } from "../../../application/use-cases/comments/resolve-comment";
import { DeleteCommentUseCase } from "../../../application/use-cases/comments/delete-comment";
import { SyncToDriveUseCase } from "../../../application/use-cases/drive/sync-to-drive";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { InMemoryShareRepository } from "../../fakes/in-memory-share-repository";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";
import { InMemorySnapshotRepository } from "../../fakes/in-memory-snapshot-repository";
import { InMemoryCommentRepository } from "../../fakes/in-memory-comment-repository";
import { InMemoryDriveBackupRepository } from "../../fakes/in-memory-drive-backup-repository";
import { InMemoryFolderRepository } from "../../fakes/in-memory-folder-repository";
import { FakeGoogleDriveService } from "../../fakes/fake-google-drive-service";
import { FakeTokenRefresher } from "../../fakes/fake-token-refresher";

const REJECTED = { reason: "unauthenticated" };
const RETRY_WINDOW_MS = 400;

class UnreachableSessionRepository extends InMemorySessionRepository {
  override async findUserByToken(): Promise<never> {
    throw new Error("connection terminated");
  }
}

let users: InMemoryUserRepository;
let sessions: InMemorySessionRepository;
let shares: InMemoryShareRepository;
let diagrams: InMemoryDiagramRepository;
let handshakes: number;
let httpServer: HttpServer;
let io: Server;
let url: string;
const clients: ClientSocket[] = [];

class CountingAuthenticateSocket extends AuthenticateSocketUseCase {
  override async execute(credentials: Parameters<AuthenticateSocketUseCase["execute"]>[0]) {
    handshakes += 1;
    return super.execute(credentials);
  }
}

async function startServer(sessionRepo: SessionRepository): Promise<void> {
  const scenes = new InMemorySceneRepository();
  const comments = new InMemoryCommentRepository(() => users.store);
  const createSnapshot = new CreateSnapshotUseCase(
    new InMemorySnapshotRepository(),
    scenes,
    diagrams,
  );
  httpServer = createServer();
  io = await setupSocketServer(httpServer, {
    authenticateSocket: new CountingAuthenticateSocket(sessionRepo, shares),
    joinRoom: new JoinRoomUseCase(sessionRepo, diagrams, scenes),
    joinRoomGuest: new JoinRoomGuestUseCase(shares, diagrams, scenes),
    saveScene: new SaveSceneUseCase(scenes),
    syncToDrive: new SyncToDriveUseCase(
      new FakeGoogleDriveService(),
      new InMemoryDriveBackupRepository(),
      new FakeTokenRefresher(),
      diagrams,
      new InMemoryFolderRepository(),
    ),
    createComment: new CreateCommentUseCase(comments, diagrams, scenes),
    replyComment: new ReplyCommentUseCase(comments, diagrams),
    resolveComment: new ResolveCommentUseCase(comments, diagrams),
    deleteComment: new DeleteCommentUseCase(comments, diagrams),
    createSnapshot,
  });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
}

async function stopServer() {
  clients.splice(0).forEach((socket) => socket.close());
  await io.close();
}

before(() => {
  users = new InMemoryUserRepository();
  sessions = new InMemorySessionRepository(() => users.store);
  shares = new InMemoryShareRepository();
  diagrams = new InMemoryDiagramRepository();
  return startServer(sessions);
});

after(stopServer);

beforeEach(() => {
  handshakes = 0;
});

type Credentials = { cookie?: string; shareToken?: unknown };

function open({ cookie, shareToken }: Credentials): ClientSocket {
  const options: Partial<ManagerOptions> & { auth?: object } = {
    parser: msgpackParser,
    transports: ["websocket"],
    forceNew: true,
    reconnectionDelay: 20,
    reconnectionDelayMax: 20,
    ...(cookie ? { extraHeaders: { cookie } } : {}),
    ...(shareToken === undefined ? {} : { auth: { shareToken } }),
  };
  const socket = connect(url, options);
  clients.push(socket);
  return socket;
}

function connected(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
}

type Refusal = { message: string; data?: unknown; activeWhenRefused: boolean };

function refused(socket: ClientSocket): Promise<Refusal> {
  return new Promise((resolve, reject) => {
    socket.once("connect", () => reject(new Error("handshake was admitted")));
    socket.once("connect_error", (error: Error & { data?: unknown }) =>
      resolve({ message: error.message, data: error.data, activeWhenRefused: socket.active }),
    );
  });
}

function next(socket: ClientSocket, event: string, ms = 1000): Promise<unknown> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (payload: unknown) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function signedIn() {
  const user = await users.create({
    email: `${crypto.randomUUID()}@test.com`,
    name: "Owner",
    passwordHash: "h",
  });
  const session = await sessions.create(user.id);
  const diagram = await diagrams.create({ title: "Board", ownerId: user.id });
  return { user, session, diagram, cookie: `drawhaus_session=${session.token}` };
}

describe("socket handshake auth — rejected", () => {
  it("refuses a socket with no credentials and does not let it retry", async () => {
    const socket = open({});

    const error = await refused(socket);
    await sleep(RETRY_WINDOW_MS);

    assert.deepEqual(error.data, REJECTED);
    assert.match(error.message, /reload/i);
    assert.equal(error.activeWhenRefused, false);
    assert.equal(socket.active, false);
    assert.equal(handshakes, 1);
  });

  it("refuses an unknown session cookie", async () => {
    const error = await refused(open({ cookie: "drawhaus_session=not-a-session" }));

    assert.deepEqual(error.data, REJECTED);
  });

  it("refuses the session of a disabled user", async () => {
    const { user, cookie } = await signedIn();
    await users.adminUpdate(user.id, { disabled: true });

    const error = await refused(open({ cookie }));

    assert.deepEqual(error.data, REJECTED);
  });

  it("refuses an unknown, an expired and a malformed share token", async () => {
    const { user, diagram } = await signedIn();
    const expired = await shares.create({
      diagramId: diagram.id,
      createdBy: user.id,
      role: "editor",
      expiresAt: new Date(Date.now() - 1000),
    });

    for (const shareToken of ["no-such-token", expired.token, "", 42, { $ne: null }]) {
      const error = await refused(open({ shareToken }));
      assert.deepEqual(error.data, REJECTED, `shareToken ${JSON.stringify(shareToken)}`);
    }
  });
});

describe("socket handshake auth — admitted", () => {
  it("admits a session cookie, and join-room still decides the room", async () => {
    const { user, diagram, cookie } = await signedIn();
    const socket = open({ cookie });
    await connected(socket);

    const joined = next(socket, "room-joined");
    socket.emit("join-room", { roomId: diagram.id });

    assert.deepEqual(await joined, { roomId: diagram.id, role: "owner", userId: user.id });
  });

  it("admits a signed-in socket that joins a board it has no access to, then refuses the join", async () => {
    const { cookie } = await signedIn();
    const stranger = await signedIn();
    const socket = open({ cookie });
    await connected(socket);

    const roomError = next(socket, "room-error");
    const joined = next(socket, "room-joined", 300);
    socket.emit("join-room", { roomId: stranger.diagram.id });

    assert.deepEqual(await roomError, { message: "Join failed" });
    assert.equal(await joined, null);
  });

  it("admits a share token and lets it join that board as a guest", async () => {
    const { user, diagram } = await signedIn();
    const link = await shares.create({
      diagramId: diagram.id,
      createdBy: user.id,
      role: "viewer",
      expiresAt: null,
    });
    const socket = open({ shareToken: link.token });
    await connected(socket);

    const joined = next(socket, "room-joined");
    socket.emit("join-room-guest", { shareToken: link.token, guestName: "Ada" });

    assert.deepEqual(await joined, {
      roomId: diagram.id,
      role: "viewer",
      userId: `guest_${socket.id}`,
    });
  });

  it("admits a valid share token next to a stale session cookie", async () => {
    const { user, diagram } = await signedIn();
    const link = await shares.create({
      diagramId: diagram.id,
      createdBy: user.id,
      role: "editor",
      expiresAt: null,
    });

    await connected(open({ cookie: "drawhaus_session=expired-long-ago", shareToken: link.token }));
  });

  it("gives a share-token socket nothing on another board", async () => {
    const { user, diagram } = await signedIn();
    const other = await signedIn();
    const link = await shares.create({
      diagramId: diagram.id,
      createdBy: user.id,
      role: "editor",
      expiresAt: null,
    });
    const socket = open({ shareToken: link.token });
    await connected(socket);

    const joinFailed = next(socket, "room-error");
    socket.emit("join-room", { roomId: other.diagram.id });
    assert.deepEqual(await joinFailed, { message: "Join failed" });

    const guestJoinFailed = next(socket, "room-error");
    const joined = next(socket, "room-joined", 300);
    socket.emit("join-room-guest", { shareToken: "no-such-token", guestName: "Ada" });
    assert.deepEqual(await guestJoinFailed, { message: "Invalid or expired share link" });
    assert.equal(await joined, null);
  });
});

describe("socket handshake auth — a session row that disappears without a revoke (expiry)", () => {
  it("keeps the open socket, and refuses its next reconnect for good", async () => {
    const { session, cookie } = await signedIn();
    const socket = open({ cookie });
    await connected(socket);

    await sessions.delete(session.token);
    await sleep(50);
    assert.equal(socket.connected, true);

    const error = refused(socket);
    socket.io.engine.close();

    assert.deepEqual((await error).data, REJECTED);
    await sleep(RETRY_WINDOW_MS);
    assert.equal(socket.active, false);
    assert.equal(handshakes, 2);
  });
});

describe("socket handshake auth — the credential store fails", () => {
  before(async () => {
    await stopServer();
    await startServer(new UnreachableSessionRepository(() => users.store));
  });

  it("refuses with server-error instead of admitting the socket", async () => {
    const { cookie } = await signedIn();

    const error = await refused(open({ cookie }));

    assert.deepEqual(error.data, { reason: "server-error" });
  });
});
