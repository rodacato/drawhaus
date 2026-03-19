-- Track how diagrams were created (ui, api)
ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'ui';
