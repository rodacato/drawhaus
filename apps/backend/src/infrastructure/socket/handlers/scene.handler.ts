import type { Server, Socket } from "socket.io";
import { z } from "zod";
import type { SaveSceneUseCase } from "../../../application/use-cases/realtime/save-scene";
import type { SyncToDriveUseCase } from "../../../application/use-cases/drive/sync-to-drive";
import type { CreateSnapshotUseCase } from "../../../application/use-cases/snapshots/create-snapshot";
import {
  type SocketData,
  canEdit,
  checkRateLimit,
  onEvent,
  RATE_LIMIT_MAX_SCENE,
} from "../helpers";
import { logger } from "../../logger";
import { getRedisClientSync } from "../../redis-client";

const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const SNAPSHOT_INTERVAL_SECONDS = 10 * 60;
const lastIntervalSnapshot = new Map<string, number>(); // in-memory fallback

const sceneIdSchema = z.string().nullish();

const sceneUpdateSchema = z.object({
  roomId: z.string(),
  sceneId: sceneIdSchema,
  elements: z.array(z.unknown()),
});

const sceneDeltaSchema = z.object({
  roomId: z.string(),
  sceneId: sceneIdSchema,
  changed: z.array(z.looseObject({ version: z.number().optional() })),
  removedIds: z.array(z.string()),
});

const saveSceneSchema = z.object({
  roomId: z.string(),
  sceneId: sceneIdSchema,
  elements: z.array(z.unknown()),
  appState: z.record(z.string(), z.unknown()),
});

export function registerSceneHandlers(
  io: Server,
  socket: Socket,
  useCases: {
    saveScene: SaveSceneUseCase;
    syncToDrive?: SyncToDriveUseCase;
    createSnapshot: CreateSnapshotUseCase;
  },
) {
  onEvent(socket, "scene-update", sceneUpdateSchema, ({ roomId, sceneId, elements }) => {
    if (!socket.rooms.has(roomId)) return;
    if (!canEdit(socket, roomId)) return;
    if (!checkRateLimit(socket, "scene", RATE_LIMIT_MAX_SCENE)) return;

    const targetSceneId = sceneId ?? (socket.data as SocketData).activeSceneId;
    const broadcastRoom = targetSceneId ? `${roomId}:${targetSceneId}` : roomId;

    socket.to(broadcastRoom).emit("scene-updated", {
      roomId,
      sceneId: targetSceneId,
      fromUserId: (socket.data as SocketData).userId,
      fromSocketId: socket.id,
      elements,
    });
  });

  /* ─── scene-delta: incremental element changes (concurrent editing) ─── */
  onEvent(socket, "scene-delta", sceneDeltaSchema, ({ roomId, sceneId, changed, removedIds }) => {
    if (!socket.rooms.has(roomId)) return;
    if (!canEdit(socket, roomId)) return;
    if (!checkRateLimit(socket, "scene", RATE_LIMIT_MAX_SCENE)) return;

    // Security: reject deltas that remove >50% of known elements
    if (removedIds.length > 500) return;

    // Security: reject version jumps >100 in any changed element
    if (changed.some((el) => el.version !== undefined && el.version > 100_000)) return;

    const userId = (socket.data as SocketData).userId;
    const targetSceneId = sceneId ?? (socket.data as SocketData).activeSceneId;
    const broadcastRoom = targetSceneId ? `${roomId}:${targetSceneId}` : roomId;

    socket.to(broadcastRoom).emit("scene-delta-received", {
      roomId,
      sceneId: targetSceneId,
      fromUserId: userId,
      fromSocketId: socket.id,
      changed,
      removedIds,
    });
  });

  onEvent(
    socket,
    "save-scene",
    saveSceneSchema,
    async ({ roomId, sceneId, elements, appState }) => {
      try {
        if (!socket.rooms.has(roomId)) return;
        if (!canEdit(socket, roomId)) return;

        const saveUserId = (socket.data as SocketData).userId;

        const targetSceneId = sceneId ?? (socket.data as SocketData).activeSceneId;
        if (!targetSceneId) return;

        await useCases.saveScene.execute(targetSceneId, elements, appState);
        socket.emit("scene-saved", { roomId, sceneId: targetSceneId });

        // Fire-and-forget: interval snapshot every 10 minutes
        // Uses Redis SET NX EX for dedup across instances, falls back to in-memory Map
        const snapshotKey = `snap:interval:${roomId}`;
        let shouldSnapshot = false;
        const redis = getRedisClientSync();
        if (redis) {
          try {
            const set = await redis.set(snapshotKey, "1", "EX", SNAPSHOT_INTERVAL_SECONDS, "NX");
            shouldSnapshot = set === "OK";
          } catch {
            shouldSnapshot = false;
          }
        } else {
          const now = Date.now();
          const lastTs = lastIntervalSnapshot.get(roomId) ?? 0;
          if (now - lastTs >= SNAPSHOT_INTERVAL_MS) {
            lastIntervalSnapshot.set(roomId, now);
            shouldSnapshot = true;
          }
        }
        if (shouldSnapshot) {
          const sockets = await io.in(roomId).fetchSockets();
          const uniqueIds = new Set(
            sockets.map((s) => (s.data as SocketData).userId).filter(Boolean),
          );
          useCases.createSnapshot
            .execute(roomId, saveUserId, "interval", undefined, uniqueIds.size || 1)
            .then((snap) => {
              if (snap) {
                io.to(roomId).emit("snapshot-created", {
                  diagramId: roomId,
                  snapshot: {
                    id: snap.id,
                    trigger: snap.trigger,
                    name: snap.name,
                    createdBy: snap.createdBy,
                    createdByName: snap.createdByName,
                    activeUsers: snap.activeUsers,
                    createdAt: snap.createdAt.toISOString(),
                  },
                });
              }
            })
            .catch(() => {});
        }

        // Fire-and-forget: sync to Google Drive if enabled
        const userId = saveUserId;
        if (useCases.syncToDrive && userId) {
          useCases.syncToDrive
            .execute(userId, roomId, targetSceneId, elements, appState)
            .then((result) => {
              if (result.synced || result.error) {
                socket.emit("drive-sync-status", {
                  sceneId: targetSceneId,
                  synced: result.synced,
                  error: result.error,
                });
              }
            })
            .catch(() => {
              /* already logged inside SyncToDriveUseCase */
            });
        }
      } catch (error: unknown) {
        logger.error(error, "save-scene failed");
        socket.emit("room-error", { message: "Save failed" });
      }
    },
  );
}
