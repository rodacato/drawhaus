import express from "express";
import cors from "cors";
import { authRouter } from "./auth";
import { diagramsRouter } from "./diagrams";
import { initSchema } from "./db";

const app = express();
const PORT = process.env.PORT ?? 4000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/diagrams", diagramsRouter);

async function startServer(): Promise<void> {
  await initSchema();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});

export default app;
