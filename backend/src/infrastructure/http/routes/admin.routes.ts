import { Router } from "express";
import { z } from "zod";
import type { ListUsersUseCase } from "../../../application/use-cases/admin/list-users";
import type { AdminUpdateUserUseCase } from "../../../application/use-cases/admin/update-user";
import type { GetSiteSettingsUseCase } from "../../../application/use-cases/admin/get-site-settings";
import type { UpdateSiteSettingsUseCase } from "../../../application/use-cases/admin/update-site-settings";
import type { GetMetricsUseCase } from "../../../application/use-cases/admin/get-metrics";
import type { InviteUserUseCase } from "../../../application/use-cases/admin/invite-user";
import type { InvitationRepository } from "../../../domain/ports/invitation-repository";
import { asyncRoute } from "../middleware/async-handler";
import { requireAdmin } from "../middleware/require-admin";

const updateUserSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  disabled: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

const updateSettingsSchema = z.object({
  registrationOpen: z.boolean().optional(),
  instanceName: z.string().trim().min(1).max(100).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["user", "admin"]).optional().default("user"),
});

export function createAdminRoutes(
  useCases: {
    listUsers: ListUsersUseCase;
    updateUser: AdminUpdateUserUseCase;
    getSettings: GetSiteSettingsUseCase;
    updateSettings: UpdateSiteSettingsUseCase;
    getMetrics: GetMetricsUseCase;
    inviteUser: InviteUserUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
  invitationRepo: InvitationRepository,
) {
  const router = Router();

  // All admin routes require auth + admin role
  router.use(requireAuth, requireAdmin);

  router.get("/users", asyncRoute(async (_req, res) => {
    const users = await useCases.listUsers.execute();
    return res.json({ users });
  }));

  router.patch("/users/:id", asyncRoute(async (req, res) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const targetId = req.params.id as string;
    const user = await useCases.updateUser.execute(targetId, req.authUser.id, parsed.data);
    return res.json({ user });
  }));

  router.get("/settings", asyncRoute(async (_req, res) => {
    const settings = await useCases.getSettings.execute();
    return res.json({ settings });
  }));

  router.patch("/settings", asyncRoute(async (req, res) => {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const settings = await useCases.updateSettings.execute(parsed.data);
    return res.json({ settings });
  }));

  router.get("/metrics", asyncRoute(async (_req, res) => {
    const metrics = await useCases.getMetrics.execute();
    return res.json({ metrics });
  }));

  router.post("/invite", asyncRoute(async (req, res) => {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const invitation = await useCases.inviteUser.execute({
      email: parsed.data.email,
      role: parsed.data.role,
      invitedBy: req.authUser.id,
      inviterName: req.authUser.name,
    });
    return res.status(201).json({ invitation });
  }));

  router.get("/invitations", asyncRoute(async (_req, res) => {
    const invitations = await invitationRepo.listPending();
    return res.json({ invitations });
  }));

  return router;
}
