import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { pool } from "./db";
import { getSessionToken, getUserFromSession } from "./session";

type AccessRow = {
  id: string;
  owner_id: string;
  role: "editor" | "viewer" | null;
};

type DiagramRow = {
  elements: unknown[];
  app_state: Record<string, unknown>;
};

type ShareLinkRow = {
  diagram_id: string;
  role: "editor" | "viewer";
  expires_at: string | null;
};

type SocketData = {
  userId: string;
  userName: string;
  userEmail: string;
  isGuest: boolean;
  roomRoles: Record<string, "owner" | "editor" | "viewer">;
};

type PresenceUser = {
  userId: string;
  name: string;
  isGuest: boolean;
};

type CursorData = {
  x: number;
  y: number;
  userId: string;
  name: string;
};

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_SCENE = 30;
const RATE_LIMIT_MAX_CURSOR = 60;

async function getAccess(diagramId: string, userId: string): Promise<AccessRow | null> {
  const { rows } = await pool.query<AccessRow>(
    `
      SELECT d.id, d.owner_id, dm.role
      FROM diagrams d
      LEFT JOIN diagram_members dm
        ON dm.diagram_id = d.id
       AND dm.user_id = $2
      WHERE d.id = $1
        AND (d.owner_id = $2 OR dm.user_id IS NOT NULL)
      LIMIT 1
    `,
    [diagramId, userId]
  );
  return rows[0] ?? null;
}

async function resolveShareLink(token: string): Promise<ShareLinkRow | null> {
  const { rows } = await pool.query<ShareLinkRow>(
    "SELECT diagram_id, role, expires_at FROM share_links WHERE id = $1 LIMIT 1",
    [token]
  );
  const link = rows[0];
  if (!link) return null;
  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) return null;
  return link;
}

function getRoomPresenceUsers(io: Server, roomId: string): PresenceUser[] {
  const seen = new Set<string>();
  const users: PresenceUser[] = [];
  const socketIds = io.sockets.adapter.rooms.get(roomId);
  if (!socketIds) return users;

  for (const sid of socketIds) {
    const s = io.sockets.sockets.get(sid);
    if (!s) continue;
    const data = s.data as SocketData;
    if (data.userId && !seen.has(data.userId)) {
      seen.add(data.userId);
      users.push({ userId: data.userId, name: data.userName, isGuest: data.isGuest ?? false });
    }
  }
  return users;
}

function checkRateLimit(socket: { data: Record<string, unknown> }, bucket: string, max: number): boolean {
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

function canEdit(socket: { data: Record<string, unknown> }, roomId: string): boolean {
  const data = socket.data as SocketData;
  if (!data.userId) return false;
  const role = data.roomRoles?.[roomId];
  return role === "owner" || role === "editor";
}

export function setupSocketServer(httpServer: HttpServer): Server {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const io = new Server(httpServer, {
    cors: {
      origin: frontendUrl,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.data.roomRoles = {};
    socket.data.isGuest = false;

    // Authenticated user join
    socket.on("join-room", async ({ roomId }: { roomId: string }) => {
      try {
        const token = getSessionToken(socket.handshake.headers.cookie);
        if (!token) {
          socket.emit("room-error", { message: "Unauthorized" });
          return;
        }
        const authUser = await getUserFromSession(token);
        if (!authUser) {
          socket.emit("room-error", { message: "Unauthorized" });
          return;
        }

        const access = await getAccess(roomId, authUser.id);
        if (!access) {
          socket.emit("room-error", { message: "Forbidden" });
          return;
        }

        const role = access.owner_id === authUser.id
          ? "owner"
          : (access.role ?? "viewer");

        socket.data.userId = authUser.id;
        socket.data.userName = authUser.name;
        socket.data.userEmail = authUser.email;
        socket.data.isGuest = false;
        (socket.data.roomRoles as Record<string, string>)[roomId] = role;

        socket.join(roomId);

        const diagramRes = await pool.query<DiagramRow>(
          "SELECT elements, app_state FROM diagrams WHERE id = $1 LIMIT 1",
          [roomId]
        );
        const diagram = diagramRes.rows[0];
        if (diagram) {
          socket.emit("scene-from-db", {
            elements: diagram.elements,
            appState: diagram.app_state,
          });
        }

        socket.emit("room-joined", { roomId, role });

        io.to(roomId).emit("room-presence", {
          roomId,
          users: getRoomPresenceUsers(io, roomId),
        });
      } catch (error: unknown) {
        console.error("join-room failed", error);
        socket.emit("room-error", { message: "Join failed" });
      }
    });

    // Guest join via share link
    socket.on("join-room-guest", async ({
      shareToken,
      guestName,
    }: {
      shareToken: string;
      guestName: string;
    }) => {
      try {
        const name = (guestName || "").trim().slice(0, 50) || "Guest";
        const link = await resolveShareLink(shareToken);
        if (!link) {
          socket.emit("room-error", { message: "Invalid or expired share link" });
          return;
        }

        const roomId = link.diagram_id;
        const guestId = `guest_${socket.id}`;

        socket.data.userId = guestId;
        socket.data.userName = name;
        socket.data.userEmail = "";
        socket.data.isGuest = true;
        (socket.data.roomRoles as Record<string, string>)[roomId] = link.role;

        socket.join(roomId);

        const diagramRes = await pool.query<DiagramRow>(
          "SELECT elements, app_state FROM diagrams WHERE id = $1 LIMIT 1",
          [roomId]
        );
        const diagram = diagramRes.rows[0];
        if (diagram) {
          socket.emit("scene-from-db", {
            elements: diagram.elements,
            appState: diagram.app_state,
          });
        }

        socket.emit("room-joined", { roomId, role: link.role });

        io.to(roomId).emit("room-presence", {
          roomId,
          users: getRoomPresenceUsers(io, roomId),
        });
      } catch (error: unknown) {
        console.error("join-room-guest failed", error);
        socket.emit("room-error", { message: "Join failed" });
      }
    });

    // Scene updates
    socket.on(
      "scene-update",
      ({
        roomId,
        elements,
        appState,
      }: {
        roomId: string;
        elements: unknown[];
        appState: Record<string, unknown>;
      }) => {
        if (!socket.rooms.has(roomId)) return;
        if (!canEdit(socket, roomId)) return;
        if (!checkRateLimit(socket, "scene", RATE_LIMIT_MAX_SCENE)) return;

        socket.to(roomId).emit("scene-updated", {
          roomId,
          fromUserId: (socket.data as SocketData).userId,
          fromSocketId: socket.id,
          elements,
          appState,
        });
      }
    );

    // Cursor position broadcast
    socket.on(
      "cursor-move",
      ({ roomId, x, y }: { roomId: string; x: number; y: number }) => {
        if (!socket.rooms.has(roomId)) return;
        if (!checkRateLimit(socket, "cursor", RATE_LIMIT_MAX_CURSOR)) return;

        const data = socket.data as SocketData;
        socket.to(roomId).emit("cursor-moved", {
          userId: data.userId,
          name: data.userName,
          x,
          y,
        } satisfies CursorData);
      }
    );

    // Save scene
    socket.on(
      "save-scene",
      async ({
        roomId,
        elements,
        appState,
      }: {
        roomId: string;
        elements: unknown[];
        appState: Record<string, unknown>;
      }) => {
        try {
          if (!socket.rooms.has(roomId)) return;
          if (!canEdit(socket, roomId)) return;

          await pool.query(
            `
              UPDATE diagrams
              SET elements = $1, app_state = $2, updated_at = now()
              WHERE id = $3
            `,
            [JSON.stringify(elements), JSON.stringify(appState), roomId]
          );
          socket.emit("scene-saved", { roomId });
        } catch (error: unknown) {
          console.error("save-scene failed", error);
          socket.emit("room-error", { message: "Save failed" });
        }
      }
    );

    socket.on("disconnecting", () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue;

        const futureUsers = getRoomPresenceUsers(io, roomId).filter(
          (u) => u.userId !== (socket.data as SocketData).userId ||
            Array.from(io.sockets.adapter.rooms.get(roomId) ?? []).some(
              (sid) => sid !== socket.id &&
                (io.sockets.sockets.get(sid)?.data as SocketData)?.userId === (socket.data as SocketData).userId
            )
        );

        socket.to(roomId).emit("room-presence", {
          roomId,
          users: futureUsers,
        });

        // Notify cursor removal
        socket.to(roomId).emit("cursor-left", {
          userId: (socket.data as SocketData).userId,
        });
      }
    });
  });

  return io;
}
