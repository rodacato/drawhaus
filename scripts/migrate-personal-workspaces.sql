-- =============================================================================
-- Production Migration: Create personal workspaces for existing users
-- =============================================================================
-- This script is IDEMPOTENT — safe to run multiple times.
-- It creates a personal workspace for every user that doesn't have one yet,
-- adds the user as an admin member, and assigns all their orphaned diagrams
-- and folders to that personal workspace.
--
-- Run with:  psql "$DATABASE_URL" -f scripts/migrate-personal-workspaces.sql
-- =============================================================================

BEGIN;

-- 1. Create personal workspaces for users who don't have one yet
INSERT INTO workspaces (id, name, description, owner_id, is_personal, color, icon, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Personal',
  '',
  u.id,
  true,
  '#6366f1',
  '',
  now(),
  now()
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w WHERE w.owner_id = u.id AND w.is_personal = true
);

-- 2. Add each user as admin member of their personal workspace (if not already)
INSERT INTO workspace_members (workspace_id, user_id, role, added_at)
SELECT w.id, w.owner_id, 'admin', now()
FROM workspaces w
WHERE w.is_personal = true
  AND NOT EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id
  );

-- 3. Assign orphaned diagrams (workspace_id IS NULL) to the owner's personal workspace
UPDATE diagrams d
SET workspace_id = w.id
FROM workspaces w
WHERE w.owner_id = d.owner_id
  AND w.is_personal = true
  AND d.workspace_id IS NULL;

-- 4. Assign orphaned folders (workspace_id IS NULL) to the owner's personal workspace
UPDATE folders f
SET workspace_id = w.id
FROM workspaces w
WHERE w.owner_id = f.owner_id
  AND w.is_personal = true
  AND f.workspace_id IS NULL;

COMMIT;

-- Summary
SELECT
  (SELECT count(*) FROM workspaces WHERE is_personal = true) AS personal_workspaces,
  (SELECT count(*) FROM diagrams WHERE workspace_id IS NOT NULL) AS diagrams_assigned,
  (SELECT count(*) FROM diagrams WHERE workspace_id IS NULL) AS diagrams_orphaned,
  (SELECT count(*) FROM folders WHERE workspace_id IS NOT NULL) AS folders_assigned,
  (SELECT count(*) FROM folders WHERE workspace_id IS NULL) AS folders_orphaned;
