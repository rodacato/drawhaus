import { Router } from "express";
import { pool } from "../../db";
import { config } from "../../config";

export function createV1HealthRoutes() {
  const router = Router();

  router.get("/", async (_req, res) => {
    let database = "ok";
    try {
      await pool.query("SELECT 1");
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
