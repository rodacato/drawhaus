import express from "express";
import cors from "cors";
import { createServer } from "http";
import { config } from "./infrastructure/config";
import { initSchema } from "./infrastructure/db";

// --- Repositories ---
import { PgUserRepository } from "./infrastructure/persistence/pg-user-repository";
import { PgSessionRepository } from "./infrastructure/persistence/pg-session-repository";
import { PgDiagramRepository } from "./infrastructure/persistence/pg-diagram-repository";
import { PgShareRepository } from "./infrastructure/persistence/pg-share-repository";

// --- Services ---
import { BcryptHasher } from "./infrastructure/services/bcrypt-hasher";

// --- Use Cases: Auth ---
import { RegisterUseCase } from "./application/use-cases/auth/register";
import { LoginUseCase } from "./application/use-cases/auth/login";
import { LogoutUseCase } from "./application/use-cases/auth/logout";
import { GetCurrentUserUseCase } from "./application/use-cases/auth/get-current-user";

// --- Use Cases: Diagrams ---
import { CreateDiagramUseCase } from "./application/use-cases/diagrams/create-diagram";
import { GetDiagramUseCase } from "./application/use-cases/diagrams/get-diagram";
import { ListDiagramsUseCase } from "./application/use-cases/diagrams/list-diagrams";
import { UpdateDiagramUseCase } from "./application/use-cases/diagrams/update-diagram";
import { DeleteDiagramUseCase } from "./application/use-cases/diagrams/delete-diagram";

// --- Use Cases: Share ---
import { CreateShareLinkUseCase } from "./application/use-cases/share/create-link";
import { ResolveLinkUseCase } from "./application/use-cases/share/resolve-link";
import { ListLinksUseCase } from "./application/use-cases/share/list-links";
import { DeleteLinkUseCase } from "./application/use-cases/share/delete-link";

// --- Use Cases: Realtime ---
import { JoinRoomUseCase } from "./application/use-cases/realtime/join-room";
import { JoinRoomGuestUseCase } from "./application/use-cases/realtime/join-room-guest";
import { SaveSceneUseCase } from "./application/use-cases/realtime/save-scene";

// --- HTTP Routes ---
import { createAuthRoutes } from "./infrastructure/http/routes/auth.routes";
import { createDiagramRoutes } from "./infrastructure/http/routes/diagram.routes";
import { createShareRoutes } from "./infrastructure/http/routes/share.routes";
import { createRequireAuth } from "./infrastructure/http/middleware/require-auth";

// --- Socket ---
import { setupSocketServer } from "./infrastructure/socket";

// ============================================================
// Composition Root
// ============================================================

const userRepo = new PgUserRepository();
const sessionRepo = new PgSessionRepository();
const diagramRepo = new PgDiagramRepository();
const shareRepo = new PgShareRepository();
const hasher = new BcryptHasher();

// Auth
const register = new RegisterUseCase(userRepo, sessionRepo, hasher);
const login = new LoginUseCase(userRepo, sessionRepo, hasher);
const logout = new LogoutUseCase(sessionRepo);
const getCurrentUser = new GetCurrentUserUseCase(sessionRepo);

// Diagrams
const createDiagram = new CreateDiagramUseCase(diagramRepo);
const getDiagram = new GetDiagramUseCase(diagramRepo);
const listDiagrams = new ListDiagramsUseCase(diagramRepo);
const updateDiagram = new UpdateDiagramUseCase(diagramRepo);
const deleteDiagram = new DeleteDiagramUseCase(diagramRepo);

// Share
const createLink = new CreateShareLinkUseCase(shareRepo, diagramRepo);
const resolveLink = new ResolveLinkUseCase(shareRepo, diagramRepo);
const listLinks = new ListLinksUseCase(shareRepo, diagramRepo);
const deleteLink = new DeleteLinkUseCase(shareRepo);

// Realtime
const joinRoom = new JoinRoomUseCase(sessionRepo, diagramRepo);
const joinRoomGuest = new JoinRoomGuestUseCase(shareRepo, diagramRepo);
const saveScene = new SaveSceneUseCase(diagramRepo);

// Middleware
const requireAuth = createRequireAuth(getCurrentUser);

// ============================================================
// Express App
// ============================================================

export const app = express();

app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", createAuthRoutes({ register, login, logout, getCurrentUser }));
app.use("/api/diagrams", createDiagramRoutes({ create: createDiagram, get: getDiagram, list: listDiagrams, update: updateDiagram, delete: deleteDiagram }, requireAuth));
app.use("/api/share", createShareRoutes({ createLink, resolveLink, listLinks, deleteLink }, requireAuth));

// ============================================================
// Start
// ============================================================

async function startServer(): Promise<void> {
  await initSchema();
  const httpServer = createServer(app);
  setupSocketServer(httpServer, { joinRoom, joinRoomGuest, saveScene });

  httpServer.listen(config.port, () => {
    console.log(`Backend running on http://localhost:${config.port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
