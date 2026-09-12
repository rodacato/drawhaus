import { Router, type Response } from "express";
import { z } from "zod";
import type { ListUsersUseCase } from "../../../application/use-cases/admin/list-users";
import type { AdminUpdateUserUseCase } from "../../../application/use-cases/admin/update-user";
import type { GetSiteSettingsUseCase } from "../../../application/use-cases/admin/get-site-settings";
import type { UpdateSiteSettingsUseCase } from "../../../application/use-cases/admin/update-site-settings";
import type { GetMetricsUseCase } from "../../../application/use-cases/admin/get-metrics";
import type { InviteUserUseCase } from "../../../application/use-cases/admin/invite-user";
import type { AdminDeleteUserUseCase } from "../../../application/use-cases/admin/delete-user";
import type { InvitationRepository } from "../../../domain/ports/invitation-repository";
import type { IntegrationSecretsRepository } from "../../../domain/ports/integration-secrets-repository";
import type { ListWebhooksUseCase } from "../../../application/use-cases/webhooks/list-webhooks";
import type { CreateWebhookUseCase } from "../../../application/use-cases/webhooks/create-webhook";
import type { UpdateWebhookUseCase } from "../../../application/use-cases/webhooks/update-webhook";
import type { DeleteWebhookUseCase } from "../../../application/use-cases/webhooks/delete-webhook";
import type { RegenerateWebhookSecretUseCase } from "../../../application/use-cases/webhooks/regenerate-webhook-secret";
import type { ListWebhookDeliveriesUseCase } from "../../../application/use-cases/webhooks/list-webhook-deliveries";
import type { SendTestWebhookEventUseCase } from "../../../application/use-cases/webhooks/send-test-webhook-event";
import type { ConfigProvider } from "../../services/config-provider";
import { INTEGRATION_KEYS } from "../../../domain/entities/integration-secret";
import { WEBHOOK_EVENTS } from "../../../domain/entities/webhook";
import { formatWebhook, formatWebhookDelivery } from "../../serializers/webhook";
import { asyncRoute } from "../middleware/async-handler";
import { validate, validateParams, validateQuery } from "../middleware/validate";

const uuidParams = z.object({ id: z.uuid() });
import { requireAdmin } from "../middleware/require-admin";
import { createBackup, listBackups, getBackupConfig } from "../../services/backup-service";

const updateUserSchema = z
  .object({
    role: z.enum(["user", "admin"]).optional(),
    disabled: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

const updateSettingsSchema = z
  .object({
    registrationOpen: z.boolean().optional(),
    instanceName: z.string().trim().min(1).max(100).optional(),
    maintenanceMode: z.boolean().optional(),
    maxWorkspacesPerUser: z.number().int().min(1).max(50).optional(),
    maxMembersPerWorkspace: z.number().int().min(1).max(100).optional(),
    backupEnabled: z.boolean().optional(),
    backupCron: z.string().trim().min(1).max(100).optional(),
    backupRetentionDays: z.number().int().min(1).max(365).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

const inviteSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  role: z.enum(["user", "admin"]).optional().default("user"),
});

const webhookUrlSchema = z.string().trim().min(1).max(2048);
const webhookEventsSchema = z.array(z.enum(WEBHOOK_EVENTS)).min(1);
const webhookDescriptionSchema = z.string().trim().max(200);

const createWebhookSchema = z.object({
  url: webhookUrlSchema,
  description: webhookDescriptionSchema.optional(),
  events: webhookEventsSchema,
  active: z.boolean().optional(),
});

const updateWebhookSchema = z
  .object({
    url: webhookUrlSchema.optional(),
    description: webhookDescriptionSchema.optional(),
    events: webhookEventsSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

const deliveriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const WEBHOOKS_UNAVAILABLE =
  "ENCRYPTION_KEY not configured — webhooks cannot store a signing secret and are unavailable";

export type AdminWebhookUseCases = {
  list: ListWebhooksUseCase;
  create: CreateWebhookUseCase;
  update: UpdateWebhookUseCase;
  remove: DeleteWebhookUseCase;
  regenerateSecret: RegenerateWebhookSecretUseCase;
  listDeliveries: ListWebhookDeliveriesUseCase;
  sendTest: SendTestWebhookEventUseCase;
};

const updateIntegrationSchema = z.object({
  key: z.enum(INTEGRATION_KEYS as unknown as [string, ...string[]]),
  value: z.string(),
});

export function createAdminRoutes(
  useCases: {
    listUsers: ListUsersUseCase;
    updateUser: AdminUpdateUserUseCase;
    getSettings: GetSiteSettingsUseCase;
    updateSettings: UpdateSiteSettingsUseCase;
    getMetrics: GetMetricsUseCase;
    inviteUser: InviteUserUseCase;
    deleteUser: AdminDeleteUserUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
  invitationRepo: InvitationRepository,
  integrationSecrets?: { repo: IntegrationSecretsRepository; configProvider: ConfigProvider },
  webhooks?: AdminWebhookUseCases,
) {
  const router = Router();

  // All admin routes require auth + admin role
  router.use(requireAuth, requireAdmin);

  router.get(
    "/users",
    asyncRoute(async (_req, res) => {
      const users = await useCases.listUsers.execute();
      return res.json({ users });
    }),
  );

  router.patch(
    "/users/:id",
    validateParams(uuidParams),
    validate(updateUserSchema),
    asyncRoute(async (req, res) => {
      const targetId = req.params.id as string;
      const user = await useCases.updateUser.execute(targetId, req.authUser.id, req.body);
      return res.json({ user });
    }),
  );

  router.delete(
    "/users/:id",
    validateParams(uuidParams),
    asyncRoute(async (req, res) => {
      const targetId = req.params.id as string;
      await useCases.deleteUser.execute(targetId, req.authUser.id);
      return res.json({ success: true });
    }),
  );

  router.get(
    "/settings",
    asyncRoute(async (_req, res) => {
      const settings = await useCases.getSettings.execute();
      return res.json({ settings });
    }),
  );

  router.patch(
    "/settings",
    validate(updateSettingsSchema),
    asyncRoute(async (req, res) => {
      const settings = await useCases.updateSettings.execute(req.body);

      // Restart backup scheduler if backup config changed
      if (
        req.body.backupEnabled !== undefined ||
        req.body.backupCron !== undefined ||
        req.body.backupRetentionDays !== undefined
      ) {
        const { startBackupScheduler } = await import("../../services/backup-scheduler");
        await startBackupScheduler();
      }

      return res.json({ settings });
    }),
  );

  router.get(
    "/metrics",
    asyncRoute(async (_req, res) => {
      const metrics = await useCases.getMetrics.execute();
      return res.json({ metrics });
    }),
  );

  router.post(
    "/invite",
    validate(inviteSchema),
    asyncRoute(async (req, res) => {
      const invitation = await useCases.inviteUser.execute({
        email: req.body.email,
        role: req.body.role,
        invitedBy: req.authUser.id,
        inviterName: req.authUser.name,
      });
      return res.status(201).json({ invitation });
    }),
  );

  router.get(
    "/invitations",
    asyncRoute(async (_req, res) => {
      const invitations = await invitationRepo.listPending();
      return res.json({ invitations });
    }),
  );

  // --- Integration secrets ---

  router.get(
    "/integrations",
    asyncRoute(async (_req, res) => {
      if (!integrationSecrets) {
        // No encryption key — report all as env-sourced
        const integrations = INTEGRATION_KEYS.map((key) => ({
          key,
          source: process.env[key] ? ("env" as const) : ("none" as const),
          maskedValue: maskValue(process.env[key] ?? ""),
        }));
        return res.json({ integrations, encryptionEnabled: false });
      }

      const dbKeys = await integrationSecrets.repo.listKeys();
      const dbKeySet = new Set(dbKeys.map((k) => k.key));

      const integrations = await Promise.all(
        INTEGRATION_KEYS.map(async (key) => {
          if (dbKeySet.has(key)) {
            const value = await integrationSecrets.configProvider.get(key);
            return { key, source: "db" as const, maskedValue: maskValue(value) };
          }
          return {
            key,
            source: process.env[key] ? ("env" as const) : ("none" as const),
            maskedValue: maskValue(process.env[key] ?? ""),
          };
        }),
      );
      return res.json({ integrations, encryptionEnabled: true });
    }),
  );

  router.patch(
    "/integrations",
    validate(updateIntegrationSchema),
    asyncRoute(async (req, res) => {
      if (!integrationSecrets) {
        return res.status(400).json({
          error:
            "ENCRYPTION_KEY not configured — secrets can only be set via environment variables",
        });
      }

      if (req.body.value === "") {
        await integrationSecrets.repo.delete(req.body.key);
      } else {
        await integrationSecrets.repo.set(req.body.key, req.body.value);
      }
      integrationSecrets.configProvider.invalidate(req.body.key);

      return res.json({ success: true });
    }),
  );

  // --- Backups ---

  router.get(
    "/backups",
    asyncRoute(async (_req, res) => {
      const [backups, cfg] = await Promise.all([listBackups(), getBackupConfig()]);
      return res.json({
        backups: backups.map((b) => ({
          filename: b.filename,
          size: b.size,
          createdAt: b.createdAt.toISOString(),
        })),
        config: { retentionDays: cfg.retentionDays, schedule: cfg.schedule, enabled: cfg.enabled },
      });
    }),
  );

  router.post(
    "/backups/trigger",
    asyncRoute(async (_req, res) => {
      const result = await createBackup();
      return res.status(201).json({
        backup: { filename: result.filename, size: result.size, durationMs: result.durationMs },
      });
    }),
  );

  // --- Webhooks ---

  router.get(
    "/webhooks",
    asyncRoute(async (_req, res) => {
      if (!webhooks) {
        return res.json({ webhooks: [], events: WEBHOOK_EVENTS, encryptionEnabled: false });
      }
      const registered = await webhooks.list.execute();
      return res.json({
        webhooks: registered.map(formatWebhook),
        events: WEBHOOK_EVENTS,
        encryptionEnabled: true,
      });
    }),
  );

  router.post(
    "/webhooks",
    validate(createWebhookSchema),
    asyncRoute(async (req, res) => {
      if (!webhooks) return webhooksUnavailable(res);
      const { webhook, secret } = await webhooks.create.execute(req.body);
      return res.status(201).json({ webhook: formatWebhook(webhook), secret });
    }),
  );

  router.patch(
    "/webhooks/:id",
    validateParams(uuidParams),
    validate(updateWebhookSchema),
    asyncRoute(async (req, res) => {
      if (!webhooks) return webhooksUnavailable(res);
      const webhook = await webhooks.update.execute(req.params.id as string, req.body);
      return res.json({ webhook: formatWebhook(webhook) });
    }),
  );

  router.delete(
    "/webhooks/:id",
    validateParams(uuidParams),
    asyncRoute(async (req, res) => {
      if (!webhooks) return webhooksUnavailable(res);
      await webhooks.remove.execute(req.params.id as string);
      return res.json({ success: true });
    }),
  );

  router.post(
    "/webhooks/:id/secret",
    validateParams(uuidParams),
    asyncRoute(async (req, res) => {
      if (!webhooks) return webhooksUnavailable(res);
      const { webhook, secret } = await webhooks.regenerateSecret.execute(req.params.id as string);
      return res.json({ webhook: formatWebhook(webhook), secret });
    }),
  );

  router.get(
    "/webhooks/:id/deliveries",
    validateParams(uuidParams),
    validateQuery(deliveriesQuerySchema),
    asyncRoute(async (req, res) => {
      if (!webhooks) return webhooksUnavailable(res);
      const deliveries = await webhooks.listDeliveries.execute(
        req.params.id as string,
        req.query.limit as number | undefined,
      );
      return res.json({ deliveries: deliveries.map(formatWebhookDelivery) });
    }),
  );

  router.post(
    "/webhooks/:id/test",
    validateParams(uuidParams),
    asyncRoute(async (req, res) => {
      if (!webhooks) return webhooksUnavailable(res);
      const result = await webhooks.sendTest.execute(req.params.id as string, req.authUser.id);
      return res.json({ result });
    }),
  );

  return router;
}

function webhooksUnavailable(res: Response) {
  return res.status(400).json({ error: WEBHOOKS_UNAVAILABLE });
}

function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "\u2022".repeat(value.length);
  return value.slice(0, 4) + "\u2022".repeat(Math.min(value.length - 8, 12)) + value.slice(-4);
}
