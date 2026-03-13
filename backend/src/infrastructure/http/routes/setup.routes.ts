import { Router } from "express";
import { z } from "zod";
import type { GetSiteSettingsUseCase } from "../../../application/use-cases/admin/get-site-settings";
import type { UpdateSiteSettingsUseCase } from "../../../application/use-cases/admin/update-site-settings";
import type { UserRepository } from "../../../domain/ports/user-repository";
import { asyncPublicRoute, asyncRoute } from "../middleware/async-handler";
import { requireAdmin } from "../middleware/require-admin";

const step2Schema = z.object({
  instanceName: z.string().trim().min(1).max(100),
  registrationOpen: z.boolean(),
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

  router.post("/step-2", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
    const parsed = step2Schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const settings = await useCases.updateSettings.execute(parsed.data);
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
