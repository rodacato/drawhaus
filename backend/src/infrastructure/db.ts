import { Pool } from "pg";
import { config } from "./config";

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      disabled BOOLEAN NOT NULL DEFAULT false,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS folders_owner_id_idx ON folders (owner_id);

    CREATE TABLE IF NOT EXISTS diagrams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
      title TEXT NOT NULL DEFAULT 'Untitled',
      elements JSONB NOT NULL DEFAULT '[]',
      app_state JSONB NOT NULL DEFAULT '{}',
      thumbnail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS diagram_members (
      diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'editor',
      added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (diagram_id, user_id),
      CHECK (role IN ('editor', 'viewer'))
    );

    CREATE TABLE IF NOT EXISTS share_links (
      id TEXT PRIMARY KEY,
      diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'viewer',
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (role IN ('editor', 'viewer'))
    );

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

    CREATE TABLE IF NOT EXISTS site_settings (
      id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
      registration_open BOOLEAN NOT NULL DEFAULT true,
      instance_name TEXT NOT NULL DEFAULT 'Drawhaus'
    );

    -- Seed default row if missing
    INSERT INTO site_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS comment_threads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
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

    CREATE TABLE IF NOT EXISTS comment_replies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      thread_id UUID NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS comment_replies_thread_id_idx ON comment_replies (thread_id);

    CREATE INDEX IF NOT EXISTS share_links_diagram_id_idx ON share_links (diagram_id);
    CREATE INDEX IF NOT EXISTS diagrams_owner_id_idx ON diagrams (owner_id);
    CREATE INDEX IF NOT EXISTS diagrams_folder_id_idx ON diagrams (folder_id);
    CREATE INDEX IF NOT EXISTS diagrams_updated_at_idx ON diagrams (updated_at DESC);
    CREATE INDEX IF NOT EXISTS diagram_members_user_id_idx ON diagram_members (user_id);
  `);

  // Add columns for upgrades from older schema
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
    ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS thumbnail TEXT;
  `);
}
