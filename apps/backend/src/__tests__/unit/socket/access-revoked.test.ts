import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Server } from "socket.io";
import { io as connect, type Socket as ClientSocket, type ManagerOptions } from "socket.io-client";
import msgpackParser from "socket.io-msgpack-parser";
import { setupSocketServer } from "../../../infrastructure/socket";
import { SocketIoRealtimeNotifier } from "../../../infrastructure/socket/realtime-notifier";
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
import { LogoutUseCase } from "../../../application/use-cases/auth/logout";
import { ResetPasswordUseCase } from "../../../application/use-cases/auth/reset-password";
import { DeleteAccountUseCase } from "../../../application/use-cases/auth/delete-account";
import { AdminUpdateUserUseCase } from "../../../application/use-cases/admin/update-user";
import { AdminDeleteUserUseCase } from "../../../application/use-cases/admin/delete-user";
import { DeleteLinkUseCase } from "../../../application/use-cases/share/delete-link";
import type { ShareLink } from "../../../domain/entities/share-link";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { InMemoryShareRepository } from "../../fakes/in-memory-share-repository";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";
import { InMemorySnapshotRepository } from "../../fakes/in-memory-snapshot-repository";
import { InMemoryCommentRepository } from "../../fakes/in-memory-comment-repository";
import { InMemoryDriveBackupRepository } from "../../fakes/in-memory-drive-backup-repository";
import { InMemoryFolderRepository } from "../../fakes/in-memory-folder-repository";
import { InMemoryPasswordResetRepository } from "../../fakes/in-memory-password-reset-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { FakeGoogleDriveService } from "../../fakes/fake-google-drive-service";
import { FakeTokenRefresher } from "../../fakes/fake-token-refresher";
import { FakeHasher } from "../../fakes/fake-hasher";
import { NoopAuditLogger } from "../../fakes/noop-audit-logger";

const RETRY_WINDOW_MS = 300;
const CLOSE_TIMEOUT_MS = 2000;

/** Holds `findByToken` open for one token, so a revoke can land while a guest join is looking it up. */
class GatedShareRepository extends InMemoryShareRepository {
  private gate: { token: string; started: () => void; release: Promise<void> } | null = null;

  hold(token: string): { started: Promise<void>; release: () => void } {
    let started!: () => void;
    let release!: () => void;
    const startedPromise = new Promise<void>((resolve) => (started = resolve));
    this.gate = { token, started, release: new Promise<void>((resolve) => (release = resolve)) };
    return { started: startedPromise, release };
  }

  override async findByToken(token: string): Promise<ShareLink | null> {
    const found = await super.findByToken(token);
    const gate = this.gate;
    if (gate?.token === token) {
      this.gate = null;
      gate.started();
      await gate.release;
    }
    return found;
  }
}

const users = new InMemoryUserRepository();
const sessions = new InMemorySessionRepository(() => users.store);
const shares = new GatedShareRepository();
const diagrams = new InMemoryDiagramRepository();
const notifier = new SocketIoRealtimeNotifier();
const audit = new NoopAuditLogger();
const clients: ClientSocket[] = [];
let httpServer: HttpServer;
let io: Server;
let url: string;

before(async () => {
  const scenes = new InMemorySceneRepository();
  const comments = new InMemoryCommentRepository(() => users.store);
  httpServer = createServer();
  io = await setupSocketServer(httpServer, {
    authenticateSocket: new AuthenticateSocketUseCase(sessions, shares),
    joinRoom: new JoinRoomUseCase(sessions, diagrams, scenes),
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
    createSnapshot: new CreateSnapshotUseCase(new InMemorySnapshotRepository(), scenes, diagrams),
  });
  notifier.attach(io);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(() => {
  clients.splice(0).forEach((socket) => socket.close());
});

after(() => io.close());

type Watched = {
  socket: ClientSocket;
  /** Resolves with what the client saw when the server closed it: the notice, then the reason. */
  closed: Promise<{ notice: unknown; reason: string }>;
};

async function open(credentials: { cookie?: string; shareToken?: string }): Promise<Watched> {
  const options: Partial<ManagerOptions> & { auth?: object } = {
    parser: msgpackParser,
    transports: ["websocket"],
    forceNew: true,
    reconnectionDelay: 20,
    reconnectionDelayMax: 20,
    ...(credentials.cookie ? { extraHeaders: { cookie: credentials.cookie } } : {}),
    ...(credentials.shareToken ? { auth: { shareToken: credentials.shareToken } } : {}),
  };
  const socket = connect(url, options);
  clients.push(socket);
  let notice: unknown = null;
  socket.on("access-revoked", (payload: unknown) => (notice = payload));
  const closed = new Promise<{ notice: unknown; reason: string }>((resolve) =>
    socket.on("disconnect", (reason) => resolve({ notice, reason })),
  );
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  return { socket, closed };
}

function joined(socket: ClientSocket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    socket.once("room-joined", resolve);
    socket.once("room-error", reject);
  });
}

async function joinBoard(watched: Watched, roomId: string): Promise<Watched> {
  const done = joined(watched.socket);
  watched.socket.emit("join-room", { roomId });
  await done;
  return watched;
}

async function joinViaLink(watched: Watched, shareToken: string): Promise<Watched> {
  const done = joined(watched.socket);
  watched.socket.emit("join-room-guest", { shareToken, guestName: "Guest" });
  await done;
  return watched;
}

/** A round trip after the revoke: a closed socket cannot answer, an open one answers from the handlers. */
async function assertOpen(watched: Watched, label: string): Promise<void> {
  const answer = await watched.socket
    .timeout(1000)
    .emitWithAck("save-scene", { roomId: "not-joined", elements: [], appState: {} })
    .catch(() => null);
  assert.deepEqual(answer, { ok: false, reason: "not-in-room" }, `${label} was closed`);
}

async function assertClosedFor(watched: Watched, reason: string): Promise<void> {
  const stillOpen = sleep(CLOSE_TIMEOUT_MS).then(() => ({ notice: null, reason: "still open" }));
  assert.deepEqual(await Promise.race([watched.closed, stillOpen]), {
    notice: { reason },
    reason: "io server disconnect",
  });
  await sleep(RETRY_WINDOW_MS);
  assert.equal(watched.socket.active, false, "a revoked socket must not reconnect");
}

async function person(name: string) {
  const user = await users.create({
    email: `${crypto.randomUUID()}@test.com`,
    name,
    passwordHash: "hashed_secret",
  });
  const signIn = async () => `drawhaus_session=${(await sessions.create(user.id)).token}`;
  return { user, signIn };
}

async function sharedBoard() {
  const ada = await person("Ada");
  const bob = await person("Bob");
  const diagram = await diagrams.create({ title: "Board", ownerId: ada.user.id });
  diagrams.members.push({ diagramId: diagram.id, userId: bob.user.id, role: "editor" });
  return { ada, bob, diagram };
}

function tokenOf(cookie: string): string {
  return cookie.split("=")[1];
}

describe("closing open sockets — logout", () => {
  it("closes the socket of the session that logged out, and no other tab", async () => {
    const { ada, bob, diagram } = await sharedBoard();
    const leavingCookie = await ada.signIn();
    const leaving = await joinBoard(await open({ cookie: leavingCookie }), diagram.id);
    const otherTab = await joinBoard(await open({ cookie: await ada.signIn() }), diagram.id);
    const teammate = await joinBoard(await open({ cookie: await bob.signIn() }), diagram.id);

    await new LogoutUseCase(sessions, notifier).execute(tokenOf(leavingCookie));

    await assertClosedFor(leaving, "session-ended");
    await assertOpen(otherTab, "the same user's other session");
    await assertOpen(teammate, "an unrelated user in the same room");
  });
});

describe("closing open sockets — every session of a user", () => {
  const endings: [string, (userId: string, adminId: string) => Promise<void>][] = [
    [
      "a password reset",
      async (userId) => {
        const resets = new InMemoryPasswordResetRepository();
        const token = crypto.randomUUID();
        await resets.create({ userId, token, expiresAt: new Date(Date.now() + 60_000) });
        await new ResetPasswordUseCase(users, sessions, resets, new FakeHasher(), notifier).execute(
          { token, newPassword: "newpass1234" },
        );
      },
    ],
    [
      "an admin disabling the account",
      (userId, adminId) =>
        new AdminUpdateUserUseCase(users, sessions, audit, notifier)
          .execute(userId, adminId, { disabled: true })
          .then(() => undefined),
    ],
    [
      "an admin deleting the account",
      (userId, adminId) =>
        new AdminDeleteUserUseCase(users, sessions, audit, notifier).execute(userId, adminId),
    ],
    [
      "the user deleting their own account",
      (userId) =>
        new DeleteAccountUseCase(
          users,
          new FakeHasher(),
          audit,
          new InMemoryWorkspaceRepository(),
          notifier,
        ).execute(userId, "secret"),
    ],
  ];

  for (const [ending, endSessions] of endings) {
    it(`closes all of a user's sockets on ${ending}, and nobody else's`, async () => {
      const { ada, bob, diagram } = await sharedBoard();
      const admin = await person("Admin");
      await users.adminUpdate(admin.user.id, { role: "admin" });
      const owner = await joinBoard(await open({ cookie: await ada.signIn() }), diagram.id);
      const firstTab = await joinBoard(await open({ cookie: await bob.signIn() }), diagram.id);
      const secondTab = await open({ cookie: await bob.signIn() });

      await endSessions(bob.user.id, admin.user.id);

      await assertClosedFor(firstTab, "session-ended");
      await assertClosedFor(secondTab, "session-ended");
      await assertOpen(owner, "an unrelated user in the same room");
    });
  }
});

describe("closing open sockets — share-link revoke", () => {
  it("closes every socket the link admitted, not the owner's nor another link's", async () => {
    const { ada, bob, diagram } = await sharedBoard();
    const link = await shares.create({
      diagramId: diagram.id,
      createdBy: ada.user.id,
      role: "editor",
      expiresAt: null,
    });
    const otherLink = await shares.create({
      diagramId: diagram.id,
      createdBy: ada.user.id,
      role: "viewer",
      expiresAt: null,
    });
    const owner = await joinBoard(await open({ cookie: await ada.signIn() }), diagram.id);
    const guest = await joinViaLink(await open({ shareToken: link.token }), link.token);
    const signedInViaLink = await joinViaLink(
      await open({ cookie: await bob.signIn(), shareToken: link.token }),
      link.token,
    );
    const otherGuest = await joinViaLink(
      await open({ shareToken: otherLink.token }),
      otherLink.token,
    );

    await new DeleteLinkUseCase(shares, notifier).execute(link.token, ada.user.id);

    await assertClosedFor(guest, "share-link-revoked");
    await assertClosedFor(signedInViaLink, "share-link-revoked");
    await assertOpen(owner, "the link's owner, signed in with a cookie");
    await assertOpen(otherGuest, "a guest on another link to the same board");
  });

  it("closes a guest join whose link lookup was still in flight when the link was revoked", async () => {
    const { ada, bob, diagram } = await sharedBoard();
    const link = await shares.create({
      diagramId: diagram.id,
      createdBy: ada.user.id,
      role: "editor",
      expiresAt: null,
    });
    const joining = await open({ cookie: await bob.signIn() });
    const lookup = shares.hold(link.token);

    joining.socket.emit("join-room-guest", { shareToken: link.token, guestName: "Bob" });
    await lookup.started;
    await new DeleteLinkUseCase(shares, notifier).execute(link.token, ada.user.id);
    lookup.release();

    await assertClosedFor(joining, "share-link-revoked");
  });
});

describe("closing open sockets — room names", () => {
  it("never names a room after a session token or a share token", async () => {
    const { ada, diagram } = await sharedBoard();
    const cookie = await ada.signIn();
    const link = await shares.create({
      diagramId: diagram.id,
      createdBy: ada.user.id,
      role: "viewer",
      expiresAt: null,
    });
    const signedIn = await joinViaLink(
      await joinBoard(await open({ cookie }), diagram.id),
      link.token,
    );
    const guest = await joinViaLink(await open({ shareToken: link.token }), link.token);

    const rooms = [signedIn, guest].flatMap(({ socket }) => [
      ...(io.sockets.sockets.get(socket.id!)?.rooms ?? []),
    ]);

    assert.ok(rooms.length > 4, `expected board and access rooms, got ${rooms.join(", ")}`);
    for (const secret of [tokenOf(cookie), link.token]) {
      assert.deepEqual(
        rooms.filter((room) => room.includes(secret)),
        [],
      );
    }
  });
});
