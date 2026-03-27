import { Router } from "express";
import { pool as defaultPool } from "../../db";
import { config } from "../../config";

export function createV1HealthRoutes(dbPool?: { query: (sql: string) => Promise<unknown> }) {
  const router = Router();
  const queryPool = dbPool ?? defaultPool;

  router.get("/", async (_req, res) => {
    let database = "ok";
    try {
      await queryPool.query("SELECT 1");
    } catch {
      database = "error";
    }
    const status = database === "ok" ? "ok" : "degraded";
    res.status(status === "ok" ? 200 : 503).json({
      status,
      version: config.appVersion,
      database,
    });
  });

  return router;
}
