-- Bumped by every write that replaces a scene (snapshot restore, content PATCH), so a save
-- computed against an older revision is refused instead of merged back in (ADR-026).
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0;
