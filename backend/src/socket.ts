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

function toRoomPresence(io: Server, roomId: string): string[] {
  return Array.from(io.sockets.adapter.rooms.get(roomId) ?? []);
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

        socket.data.userId = authUser.id;
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

        io.to(roomId).emit("room-presence", {
          roomId,
          users: toRoomPresence(io, roomId),
        });
      } catch (error: unknown) {
        console.error("join-room failed", error);
        socket.emit("room-error", { message: "Join failed" });
      }
    });

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
        const userId = socket.data.userId as string | undefined;
        if (!userId) {
          return;
        }
        socket.to(roomId).emit("scene-updated", {
          roomId,
          fromUserId: userId,
          fromSocketId: socket.id,
          elements,
          appState,
        });
      }
    );

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
          const userId = socket.data.userId as string | undefined;
          if (!userId) {
            return;
          }
          const access = await getAccess(roomId, userId);
          if (!access) {
            return;
          }
          if (access.owner_id !== userId && access.role !== "editor") {
            return;
          }
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
        if (roomId === socket.id) {
          continue;
        }
        socket.to(roomId).emit("room-presence", {
          roomId,
          users: toRoomPresence(io, roomId).filter((id) => id !== socket.id),
        });
      }
    });
  });

  return io;
}
