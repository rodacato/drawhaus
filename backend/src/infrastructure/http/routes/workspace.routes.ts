import { Router } from "express";
import { z } from "zod";
import type { CreateWorkspaceUseCase } from "../../../application/use-cases/workspaces/create-workspace";
import type { ListWorkspacesUseCase } from "../../../application/use-cases/workspaces/list-workspaces";
import type { GetWorkspaceUseCase } from "../../../application/use-cases/workspaces/get-workspace";
import type { UpdateWorkspaceUseCase } from "../../../application/use-cases/workspaces/update-workspace";
import type { DeleteWorkspaceUseCase } from "../../../application/use-cases/workspaces/delete-workspace";
import type { AddWorkspaceMemberUseCase, UpdateWorkspaceMemberRoleUseCase, RemoveWorkspaceMemberUseCase } from "../../../application/use-cases/workspaces/manage-members";
import type { InviteToWorkspaceUseCase } from "../../../application/use-cases/workspaces/invite-to-workspace";
import type { AcceptWorkspaceInviteUseCase } from "../../../application/use-cases/workspaces/accept-workspace-invite";
import type { EnsurePersonalWorkspaceUseCase } from "../../../application/use-cases/workspaces/ensure-personal-workspace";
import { asyncRoute } from "../middleware/async-handler";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  color: z.string().trim().max(20).optional(),
  icon: z.string().trim().max(10).optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  color: z.string().trim().max(20).optional(),
  icon: z.string().trim().max(10).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "editor", "viewer"]).optional().default("editor"),
});

const roleSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
});

export function createWorkspaceRoutes(
  useCases: {
    create: CreateWorkspaceUseCase;
    list: ListWorkspacesUseCase;
    get: GetWorkspaceUseCase;
    update: UpdateWorkspaceUseCase;
    delete: DeleteWorkspaceUseCase;
    addMember: AddWorkspaceMemberUseCase;
    updateMemberRole: UpdateWorkspaceMemberRoleUseCase;
    removeMember: RemoveWorkspaceMemberUseCase;
    invite: InviteToWorkspaceUseCase;
    acceptInvite: AcceptWorkspaceInviteUseCase;
    ensurePersonal: EnsurePersonalWorkspaceUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();

  // Public: accept workspace invite (needs auth but separate flow)
  router.post("/accept-invite", requireAuth, asyncRoute(async (req, res) => {
    const token = req.body?.token;
    if (typeof token !== "string") return res.status(400).json({ error: "token is required" });
    const result = await useCases.acceptInvite.execute(token, req.authUser.id);
    return res.json({ workspace: result.workspace, role: result.role });
  }));

  // Public: resolve invite token (check validity without accepting)
  router.get("/invite/:token", asyncRoute(async (req, res) => {
    // Just check if the token is valid — lightweight check
    const { pool } = await import("../../db");
    const { rows } = await pool.query(
      `SELECT wi.id, wi.email, wi.role, wi.expires_at, wi.used_at, w.name AS workspace_name
       FROM workspace_invitations wi JOIN workspaces w ON w.id = wi.workspace_id
       WHERE wi.token = $1 LIMIT 1`,
      [req.params.token],
    );
    if (!rows[0] || rows[0].used_at) return res.status(404).json({ error: "Invitation not found" });
    if (new Date(rows[0].expires_at) < new Date()) return res.status(410).json({ error: "Invitation expired" });
    return res.json({ workspaceName: rows[0].workspace_name, role: rows[0].role, email: rows[0].email });
  }));

  // All remaining routes require auth
  router.use(requireAuth);

  router.get("/", asyncRoute(async (req, res) => {
    // Ensure personal workspace exists
    await useCases.ensurePersonal.execute(req.authUser.id);
    const workspaces = await useCases.list.execute(req.authUser.id);
    return res.json({ workspaces });
  }));

  router.post("/", asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    const workspace = await useCases.create.execute({
      userId: req.authUser.id,
      ...parsed.data,
    });
    return res.status(201).json({ workspace });
  }));

  router.get("/:id", asyncRoute(async (req, res) => {
    const result = await useCases.get.execute(String(req.params.id), req.authUser.id);
    return res.json(result);
  }));

  router.patch("/:id", asyncRoute(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    const workspace = await useCases.update.execute(String(req.params.id), req.authUser.id, parsed.data);
    return res.json({ workspace });
  }));

  router.delete("/:id", asyncRoute(async (req, res) => {
    await useCases.delete.execute(String(req.params.id), req.authUser.id);
    return res.json({ success: true });
  }));

  // Members
  router.post("/:id/invite", asyncRoute(async (req, res) => {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    const invitation = await useCases.invite.execute({
      workspaceId: String(req.params.id),
      actorId: req.authUser.id,
      actorName: req.authUser.name,
      email: parsed.data.email,
      role: parsed.data.role,
    });
    return res.status(201).json({ invitation });
  }));

  router.patch("/:id/members/:userId", asyncRoute(async (req, res) => {
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    await useCases.updateMemberRole.execute(String(req.params.id), req.authUser.id, String(req.params.userId), parsed.data.role);
    return res.json({ success: true });
  }));

  router.delete("/:id/members/:userId", asyncRoute(async (req, res) => {
    await useCases.removeMember.execute(String(req.params.id), req.authUser.id, String(req.params.userId));
    return res.json({ success: true });
  }));

  return router;
}
