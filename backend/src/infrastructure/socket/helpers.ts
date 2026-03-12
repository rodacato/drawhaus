import type { Server } from "socket.io";

export type SocketData = {
  userId: string;
  userName: string;
  userEmail: string;
  isGuest: boolean;
  roomRoles: Record<string, "owner" | "editor" | "viewer">;
};

export type PresenceUser = {
  userId: string;
  name: string;
  isGuest: boolean;
};

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_SCENE = 30;
const RATE_LIMIT_MAX_CURSOR = 60;

export { RATE_LIMIT_MAX_SCENE, RATE_LIMIT_MAX_CURSOR };

export function checkRateLimit(socket: { data: Record<string, unknown> }, bucket: string, max: number): boolean {
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
