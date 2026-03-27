import type { Server, Socket } from "socket.io";
import { parse } from "cookie";
import type { JoinRoomUseCase } from "../../../application/use-cases/realtime/join-room";
import type { JoinRoomGuestUseCase } from "../../../application/use-cases/realtime/join-room-guest";
import type { CreateSnapshotUseCase } from "../../../application/use-cases/snapshots/create-snapshot";
import type { EditLockService } from "../edit-lock-store";
import { type SocketData, type PresenceUser, canEdit, getRoomPresenceUsers, emitLockStatus } from "../helpers";
import { config } from "../../config";
import { logger } from "../../logger";

function formatScene(s: { id: string; name: string; sortOrder: number }) {
  return { id: s.id, name: s.name, sortOrder: s.sortOrder };
}

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  useCases: { joinRoom: JoinRoomUseCase; joinRoomGuest: JoinRoomGuestUseCase; createSnapshot: CreateSnapshotUseCase },
  lockStore: EditLockService,
) {
  socket.on("join-room", async ({ roomId }: { roomId: string }) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const token = cookieHeader ? (parse(cookieHeader)[config.cookieName] ?? null) : null;

      const result = await useCases.joinRoom.execute(token, roomId);

      socket.data.userId = result.user.id;
      socket.data.userName = result.user.name;
      socket.data.userEmail = result.user.email;
      socket.data.isGuest = false;
      (socket.data.roomRoles as Record<string, string>)[roomId] = result.role;

      socket.join(roomId);

      // Join the first scene's sub-room
      const firstScene = result.scenes[0];
      if (firstScene) {
        socket.join(`${roomId}:${firstScene.id}`);
        socket.data.activeSceneId = firstScene.id;
      }

      socket.emit("scene-from-db", {
        elements: result.elements,
        appState: result.appState,
        scenes: result.scenes.map(formatScene),
        activeSceneId: firstScene?.id ?? null,
      });

      socket.emit("room-joined", { roomId, role: result.role, userId: result.user.id });

      // Emit current lock status to the joining user
      emitLockStatus(io, roomId, lockStore);

      // Auto-acquire lock if no one holds it and user can edit
      if (!lockStore.getLock(roomId) && canEdit(socket, roomId)) {
        lockStore.acquireLock(roomId, result.user.id, result.user.name, socket.id);
        socket.emit("edit-lock-acquired", { roomId, holder: { userId: result.user.id, userName: result.user.name } });
        emitLockStatus(io, roomId, lockStore);
      }

      io.to(roomId).emit("room-presence", {
        roomId,
        users: await getRoomPresenceUsers(io, roomId),
      });

    } catch (error: unknown) {
      logger.error(error, "join-room failed");
      socket.emit("room-error", { message: "Join failed" });
    }
  });

  socket.on("join-room-guest", async ({
    shareToken,
    guestName,
  }: {
    shareToken: string;
    guestName: string;
  }) => {
    try {
      const name = (guestName || "").trim().slice(0, 50) || "Guest";
      const result = await useCases.joinRoomGuest.execute(shareToken);

      const roomId = result.diagramId;
      const guestId = `guest_${socket.id}`;

      socket.data.userId = guestId;
      socket.data.userName = name;
      socket.data.userEmail = "";
      socket.data.isGuest = true;
      (socket.data.roomRoles as Record<string, string>)[roomId] = result.role;

      socket.join(roomId);

      const firstScene = result.scenes[0];
      if (firstScene) {
        socket.join(`${roomId}:${firstScene.id}`);
        socket.data.activeSceneId = firstScene.id;
      }

      socket.emit("scene-from-db", {
        elements: result.elements,
        appState: result.appState,
        scenes: result.scenes.map(formatScene),
        activeSceneId: firstScene?.id ?? null,
      });

      socket.emit("room-joined", { roomId, role: result.role, userId: guestId });

      // Emit current lock status to the joining guest
      emitLockStatus(io, roomId, lockStore);

      // Auto-acquire lock if no one holds it and guest can edit
      if (!lockStore.getLock(roomId) && canEdit(socket, roomId)) {
        lockStore.acquireLock(roomId, guestId, name, socket.id);
        socket.emit("edit-lock-acquired", { roomId, holder: { userId: guestId, userName: name } });
        emitLockStatus(io, roomId, lockStore);
      }

      io.to(roomId).emit("room-presence", {
        roomId,
        users: await getRoomPresenceUsers(io, roomId),
      });
    } catch (error: unknown) {
      logger.error(error, "join-room-guest failed");
      socket.emit("room-error", { message: "Invalid or expired share link" });
    }
  });

  socket.on("disconnecting", async () => {
    const myData = socket.data as SocketData;

    // Release any locks held by this socket
    const releasedRoomIds = lockStore.releaseBySocketId(socket.id);

    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;
      if (roomId.includes(":")) continue;

      const allSockets = await io.in(roomId).fetchSockets();
      const seen = new Set<string>();
      const futureUsers: PresenceUser[] = [];

      for (const s of allSockets) {
        if (s.id === socket.id) continue;
        const data = s.data as SocketData;
        if (data.userId && !seen.has(data.userId)) {
          seen.add(data.userId);
          futureUsers.push({ userId: data.userId, name: data.userName, isGuest: data.isGuest ?? false });
        }
      }

      // Snapshot on close if this was the last editor leaving
      const hasRemainingEditors = futureUsers.some((u) => !u.isGuest);
      if (!hasRemainingEditors && myData.userId) {
        // +1 to include the disconnecting user in the count
        const activeCount = futureUsers.length + 1;
        useCases.createSnapshot.execute(roomId, myData.userId.startsWith("guest_") ? null : myData.userId, "close", undefined, activeCount)
          .then((snap) => {
            if (snap) {
              socket.to(roomId).emit("snapshot-created", {
                diagramId: roomId,
                snapshot: { id: snap.id, trigger: snap.trigger, name: snap.name, createdBy: snap.createdBy, createdByName: snap.createdByName, activeUsers: snap.activeUsers, createdAt: snap.createdAt.toISOString() },
              });
            }
          })
          .catch(() => {});
      }

      // Emit lock status update if this room had a lock released
      // (promoteNext in the lock store already auto-assigned via onRelease callback)
      if (releasedRoomIds.includes(roomId)) {
        emitLockStatus(io, roomId, lockStore);
      }

      socket.to(roomId).emit("room-presence", { roomId, users: futureUsers });
      socket.to(roomId).emit("cursor-left", { userId: myData.userId });
    }
  });
}
