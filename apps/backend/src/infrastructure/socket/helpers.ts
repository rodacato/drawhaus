import type { Server, Socket } from "socket.io";
import type { z } from "zod";
import { logger } from "../logger";

export type SocketData = {
  userId: string;
  userName: string;
  userEmail: string;
  isGuest: boolean;
  activeSceneId?: string;
  roomRoles: Record<string, "owner" | "editor" | "viewer">;
};

export type PresenceUser = {
  userId: string;
  name: string;
  isGuest: boolean;
};

export const EVENT_ERROR = "event-error";

export function onEvent<S extends z.ZodType>(
  socket: Socket,
  event: string,
  schema: S,
  handler: (payload: z.output<S>) => unknown,
): void {
  socket.on(event, (payload: unknown) => {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      logger.warn({ event, socketId: socket.id }, "socket payload rejected");
      socket.emit(EVENT_ERROR, { event, message: "Invalid payload" });
      return;
    }
    return runSafely(socket, event, () => handler(parsed.data));
  });
}

// socket.io dispatches listeners outside any caller that could catch, so a throw here would crash the process.
export async function runSafely(
  socket: Pick<Socket, "id">,
  event: string,
  fn: () => unknown,
): Promise<void> {
  try {
    await fn();
  } catch (error: unknown) {
    logger.error({ err: error, event, socketId: socket.id }, "socket handler failed");
  }
}

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_SCENE = 30;
const RATE_LIMIT_MAX_CURSOR = 60;

export { RATE_LIMIT_MAX_SCENE, RATE_LIMIT_MAX_CURSOR };

export function checkRateLimit(
  socket: { data: Record<string, unknown> },
  bucket: string,
  max: number,
): boolean {
  const now = Date.now();
  const startKey = `_rl_${bucket}_start`;
  const countKey = `_rl_${bucket}_count`;
  const windowStart = (socket.data[startKey] as number) ?? 0;
  if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
    socket.data[startKey] = now;
    socket.data[countKey] = 1;
    return true;
  }
  const count = ((socket.data[countKey] as number) ?? 0) + 1;
  socket.data[countKey] = count;
  return count <= max;
}

export function canEdit(socket: { data: Record<string, unknown> }, roomId: string): boolean {
  const data = socket.data as SocketData;
  if (!data.userId) return false;
  const role = data.roomRoles?.[roomId];
  return role === "owner" || role === "editor";
}

/** Find the next canEdit user in a room (excluding a given socketId) */
export async function findNextEditor(
  io: Server,
  roomId: string,
  excludeSocketId?: string,
): Promise<{ userId: string; userName: string; socketId: string } | null> {
  const sockets = await io.in(roomId).fetchSockets();
  for (const s of sockets) {
    if (excludeSocketId && s.id === excludeSocketId) continue;
    const data = s.data as SocketData;
    if (data.userId && canEdit(s, roomId)) {
      return { userId: data.userId, userName: data.userName, socketId: s.id };
    }
  }
  return null;
}

export async function getRoomPresenceUsers(io: Server, roomId: string): Promise<PresenceUser[]> {
  const seen = new Set<string>();
  const users: PresenceUser[] = [];
  const remoteSockets = await io.in(roomId).fetchSockets();

  for (const s of remoteSockets) {
    const data = s.data as SocketData;
    if (data.userId && !seen.has(data.userId)) {
      seen.add(data.userId);
      users.push({ userId: data.userId, name: data.userName, isGuest: data.isGuest ?? false });
    }
  }
  return users;
}
