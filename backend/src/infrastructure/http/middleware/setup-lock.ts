import type { RequestHandler } from "express";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";

const ALLOWED_PREFIXES = [
  "/health",
  "/api/version",
  "/api/site/status",
  "/api/auth/setup-status",
  "/api/auth/register",
  "/api/auth/google",
  "/api/setup",
];

export function createSetupLock(siteSettingsRepo: SiteSettingsRepository): { middleware: RequestHandler; invalidate: () => void } {
  let cached: boolean | null = null;
  let cacheTime = 0;
  const CACHE_TTL = 30_000;

  const middleware: RequestHandler = async (req, res, next) => {
    if (cached === null || Date.now() - cacheTime > CACHE_TTL) {
      const settings = await siteSettingsRepo.get();
      cached = settings.setupCompleted;
      cacheTime = Date.now();
    }

    if (cached) return next();

    if (ALLOWED_PREFIXES.some((p) => req.path.startsWith(p))) {
      return next();
    }

    return res.status(403).json({ error: "setup_required", redirect: "/setup" });
  };

  const invalidate = () => {
    cached = null;
  };

  return { middleware, invalidate };
}
