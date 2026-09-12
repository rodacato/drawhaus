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

/** Guest ids (`guest_<socketId>`) are not user rows, so they must never reach a users foreign key. */
export function accountUserId(data: SocketData): string | null {
  return data.isGuest || !data.userId ? null : data.userId;
}

export const EVENT_ERROR = "event-error";

export type AckResponse = { ok: true; [key: string]: unknown } | { ok: false; reason: string };
export type SocketAck = (response: AckResponse) => void;

export function onEvent<S extends z.ZodType>(
  socket: Socket,
  event: string,
  schema: S,
  handler: (payload: z.output<S>, ack?: SocketAck) => unknown,
): void {
  socket.on(event, async (...args: unknown[]) => {
    const ack = takeAck(args);
    const parsed = schema.safeParse(args[0]);
    if (!parsed.success) {
      rejectInvalidPayload(socket, event);
      ack?.({ ok: false, reason: "invalid-payload" });
      return;
    }
    const completed = await runSafely(socket, event, () => handler(parsed.data, ack));
    if (!completed) ack?.({ ok: false, reason: "server-error" });
  });
}

function rejectInvalidPayload(socket: Socket, event: string): void {
  const count = countInWindow(socket, "invalid");
  if (count <= RATE_LIMIT_MAX_INVALID) {
    logger.warn({ event, socketId: socket.id }, "socket payload rejected");
    socket.emit(EVENT_ERROR, { event, message: "Invalid payload" });
  } else if (count === RATE_LIMIT_MAX_INVALID + 1) {
    logger.warn(
      { event, socketId: socket.id, limit: RATE_LIMIT_MAX_INVALID },
      "socket invalid payloads over limit; dropping the rest of this window silently",
    );
  }
}

/** Clients that want an outcome pass a callback after the payload; older ones send none. */
function takeAck(args: unknown[]): SocketAck | undefined {
  if (typeof args.at(-1) !== "function") return undefined;
  const respond = args.pop() as SocketAck;
  let answered = false;
  return (response) => {
    if (answered) return;
    answered = true;
    respond(response);
  };
}

// socket.io dispatches listeners outside any caller that could catch, so a throw here would crash the process.
export async function runSafely(
  socket: Pick<Socket, "id">,
  event: string,
  fn: () => unknown,
): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (error: unknown) {
    logger.error({ err: error, event, socketId: socket.id }, "socket handler failed");
    return false;
  }
}

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_SCENE = 30;
const RATE_LIMIT_MAX_CURSOR = 60;
const RATE_LIMIT_MAX_INVALID = 10;

export { RATE_LIMIT_MAX_SCENE, RATE_LIMIT_MAX_CURSOR, RATE_LIMIT_MAX_INVALID };

export function checkRateLimit(
  socket: { data: Record<string, unknown> },
  bucket: string,
  max: number,
): boolean {
  return countInWindow(socket, bucket) <= max;
}

function countInWindow(socket: { data: Record<string, unknown> }, bucket: string): number {
  const now = Date.now();
  const startKey = `_rl_${bucket}_start`;
  const countKey = `_rl_${bucket}_count`;
  const windowStart = (socket.data[startKey] as number) ?? 0;
  if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
    socket.data[startKey] = now;
    socket.data[countKey] = 1;
    return 1;
  }
  const count = ((socket.data[countKey] as number) ?? 0) + 1;
  socket.data[countKey] = count;
  return count;
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
