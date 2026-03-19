-- Migration 0001: Baseline schema v0.9.0
-- This migration represents the complete Drawhaus schema.
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- so it is safe to run on both fresh and existing databases.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Core tables
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  disabled BOOLEAN NOT NULL DEFAULT false,
  google_id TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New Folder',
  workspace_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS folders_owner_id_idx ON folders (owner_id);

CREATE TABLE IF NOT EXISTS diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  workspace_id UUID,
  title TEXT NOT NULL DEFAULT 'Untitled',
  elements JSONB NOT NULL DEFAULT '[]',
  app_state JSONB NOT NULL DEFAULT '{}',
  thumbnail TEXT,
  starred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diagrams_owner_id_idx ON diagrams (owner_id);
CREATE INDEX IF NOT EXISTS diagrams_folder_id_idx ON diagrams (folder_id);
CREATE INDEX IF NOT EXISTS diagrams_updated_at_idx ON diagrams (updated_at DESC);
CREATE INDEX IF NOT EXISTS diagrams_workspace_id_idx ON diagrams (workspace_id);

CREATE TABLE IF NOT EXISTS diagram_members (
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (diagram_id, user_id),
  CHECK (role IN ('editor', 'viewer'))
);

CREATE INDEX IF NOT EXISTS diagram_members_user_id_idx ON diagram_members (user_id);

CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (role IN ('editor', 'viewer'))
);

CREATE INDEX IF NOT EXISTS share_links_diagram_id_idx ON share_links (diagram_id);

-- ============================================================
-- Scenes (single scene per diagram post-simplification)
-- ============================================================

CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Scene 1',
  elements JSONB NOT NULL DEFAULT '[]',
  app_state JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scenes_diagram_id_idx ON scenes (diagram_id, sort_order);

-- ============================================================
-- Site settings (singleton row)
-- ============================================================

CREATE TABLE IF NOT EXISTS site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  registration_open BOOLEAN NOT NULL DEFAULT true,
  instance_name TEXT NOT NULL DEFAULT 'Drawhaus',
  max_workspaces_per_user INTEGER NOT NULL DEFAULT 5,
  max_members_per_workspace INTEGER NOT NULL DEFAULT 5,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  setup_completed BOOLEAN NOT NULL DEFAULT false,
  setup_skipped_integrations BOOLEAN NOT NULL DEFAULT false,
  backup_enabled BOOLEAN NOT NULL DEFAULT true,
  backup_cron TEXT NOT NULL DEFAULT '0 3 * * *',
  backup_retention_days INTEGER NOT NULL DEFAULT 7
);

INSERT INTO site_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Auto-complete setup for existing instances that already have users
UPDATE site_settings SET setup_completed = true
WHERE setup_completed = false AND EXISTS (SELECT 1 FROM users LIMIT 1);

-- ============================================================
-- Comments
-- ============================================================

CREATE TABLE IF NOT EXISTS comment_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comment_threads_diagram_id_idx ON comment_threads (diagram_id);
CREATE INDEX IF NOT EXISTS comment_threads_element_id_idx ON comment_threads (diagram_id, element_id);
CREATE INDEX IF NOT EXISTS comment_threads_scene_id_idx ON comment_threads (diagram_id, scene_id);

CREATE TABLE IF NOT EXISTS comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comment_replies_thread_id_idx ON comment_replies (thread_id);

CREATE TABLE IF NOT EXISTS comment_reactions (
  thread_id UUID NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

-- ============================================================
-- Tags
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, name)
);

CREATE TABLE IF NOT EXISTS diagram_tags (
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (diagram_id, tag_id)
);

CREATE INDEX IF NOT EXISTS tags_owner_id_idx ON tags (owner_id);
CREATE INDEX IF NOT EXISTS diagram_tags_tag_id_idx ON diagram_tags (tag_id);

-- ============================================================
-- Invitations & Password Resets
-- ============================================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  token TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invitations_token_idx ON invitations (token);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations (email);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_token_idx ON password_reset_tokens (token);

-- ============================================================
-- Workspaces
-- ============================================================

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_personal BOOLEAN NOT NULL DEFAULT false,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspaces_owner_id_idx ON workspaces (owner_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx ON workspace_members (user_id);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
  token TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_invitations_token_idx ON workspace_invitations (token);
CREATE INDEX IF NOT EXISTS workspace_invitations_email_idx ON workspace_invitations (email);

-- Add workspace FK constraints (deferred because workspaces table must exist first)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'diagrams_workspace_id_fkey' AND table_name = 'diagrams'
  ) THEN
    BEGIN
      ALTER TABLE diagrams ADD CONSTRAINT diagrams_workspace_id_fkey
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'folders_workspace_id_fkey' AND table_name = 'folders'
  ) THEN
    BEGIN
      ALTER TABLE folders ADD CONSTRAINT folders_workspace_id_fkey
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================
-- OAuth & Google Drive
-- ============================================================

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS oauth_tokens_user_id_idx ON oauth_tokens (user_id);

CREATE TABLE IF NOT EXISTS drive_backup_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  root_folder_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drive_file_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  drive_folder_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, diagram_id, scene_id)
);

CREATE INDEX IF NOT EXISTS drive_file_mappings_user_diagram_idx
  ON drive_file_mappings (user_id, diagram_id);

-- ============================================================
-- Integration Secrets
-- ============================================================

CREATE TABLE IF NOT EXISTS integration_secrets (
  key TEXT PRIMARY KEY,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Templates
-- ============================================================

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  elements JSONB NOT NULL DEFAULT '[]',
  app_state JSONB NOT NULL DEFAULT '{}',
  thumbnail TEXT,
  is_built_in BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS templates_creator_id_idx ON templates (creator_id);
CREATE INDEX IF NOT EXISTS templates_workspace_id_idx ON templates (workspace_id);

-- ============================================================
-- Diagram Snapshots (Version History)
-- ============================================================

CREATE TABLE IF NOT EXISTS diagram_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  trigger TEXT NOT NULL DEFAULT 'manual',
  name TEXT,
  active_users SMALLINT NOT NULL DEFAULT 1,
  content_hash TEXT,
  elements JSONB NOT NULL DEFAULT '[]',
  app_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diagram_snapshots_diagram_idx
  ON diagram_snapshots (diagram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS diagram_snapshots_named_idx
  ON diagram_snapshots (diagram_id) WHERE name IS NOT NULL;

-- ============================================================
-- Migrations for existing databases (idempotent ALTERs)
-- These handle upgrading databases created with older schema versions.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS thumbnail TEXT;
ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS starred BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS workspace_id UUID;

CREATE INDEX IF NOT EXISTS folders_workspace_id_idx ON folders (workspace_id);

ALTER TABLE comment_threads ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE;

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS max_workspaces_per_user INTEGER NOT NULL DEFAULT 5;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS max_members_per_workspace INTEGER NOT NULL DEFAULT 5;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS setup_skipped_integrations BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS backup_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS backup_cron TEXT NOT NULL DEFAULT '0 3 * * *';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS backup_retention_days INTEGER NOT NULL DEFAULT 7;

ALTER TABLE diagram_snapshots ADD COLUMN IF NOT EXISTS active_users SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE diagram_snapshots ADD COLUMN IF NOT EXISTS content_hash TEXT;
