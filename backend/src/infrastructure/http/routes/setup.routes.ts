import { Router } from "express";
import { z } from "zod";
import type { GetSiteSettingsUseCase } from "../../../application/use-cases/admin/get-site-settings";
import type { UpdateSiteSettingsUseCase } from "../../../application/use-cases/admin/update-site-settings";
import type { UserRepository } from "../../../domain/ports/user-repository";
import { asyncPublicRoute, asyncRoute } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { requireAdmin } from "../middleware/require-admin";

const step2Schema = z.object({
  instanceName: z.string().trim().min(1).max(100),
  registrationOpen: z.boolean(),
  backupEnabled: z.boolean().optional(),
  backupCron: z.string().trim().min(1).max(100).optional(),
  backupRetentionDays: z.number().int().min(1).max(365).optional(),
});

export function createSetupRoutes(
  useCases: {
    getSettings: GetSiteSettingsUseCase;
    updateSettings: UpdateSiteSettingsUseCase;
  },
  userRepo: UserRepository,
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
  onSetupComplete: () => void,
) {
  const router = Router();

  router.get("/status", asyncPublicRoute(async (_req, res) => {
    const settings = await useCases.getSettings.execute();
    if (settings.setupCompleted) {
      return res.json({ step: "complete", setupCompleted: true });
    }

    const userCount = await userRepo.count();
    let step: number;
    if (userCount === 0) {
      step = 1;
    } else if (settings.instanceName === "Drawhaus") {
      step = 2;
    } else {
      step = 3;
    }

    return res.json({ step, setupCompleted: false, setupSkippedIntegrations: settings.setupSkippedIntegrations });
  }));

  router.post("/step-2", requireAuth, requireAdmin, validate(step2Schema), asyncRoute(async (req, res) => {
    const settings = await useCases.updateSettings.execute(req.body);
    return res.json({ settings });
  }));

  router.post("/skip-integrations", requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
    const settings = await useCases.updateSettings.execute({ setupSkippedIntegrations: true });
    return res.json({ settings });
  }));

  router.post("/complete", requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
    const settings = await useCases.updateSettings.execute({ setupCompleted: true });
    onSetupComplete();
    return res.json({ settings });
  }));

  return router;
}
