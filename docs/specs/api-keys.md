# API Keys

> API key infrastructure for programmatic access to Drawhaus via the `/v1/` public API.

## Why

Foundation for the public API, MCP server, and future CLI tool. Enables developers and AI agents to create/read/update diagrams programmatically without browser sessions. Separates programmatic auth (API keys) from interactive auth (cookies).

## Architecture

- Keys generated server-side: `dhk_` prefix + 32 random bytes (base64url) = ~48 chars total
- Only the SHA-256 hash stored in DB — plaintext shown once at creation, never again
- Each key scoped to one workspace — no global keys
- Middleware chain: `requireSdkHeader` → `requireApiKey` → `logApiRequest`
- Rate limit: 60 req/min per key (separate from UI rate limit), disabled in `NODE_ENV=test`
- Request logging: every `/v1/` request logged with key_id, method, path, status, IP

## Database

```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,        -- "dhk_abc123" (first 10 chars, for identification)
  key_hash TEXT NOT NULL,          -- SHA-256 of full key
  expires_at TIMESTAMPTZ,          -- null = never expires
  revoked_at TIMESTAMPTZ,          -- null = active
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys (key_hash);

CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_request_logs_key_id_idx ON api_request_logs (key_id);
CREATE INDEX IF NOT EXISTS api_request_logs_created_at_idx ON api_request_logs (created_at);
```

## Key Generation

```
dhk_ + crypto.randomBytes(32).toString('base64url')
→ "dhk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2"
```

- Prefix `dhk_` enables GitHub secret scanning and leak detection
- `key_prefix` column stores first 10 chars for display: `dhk_a1b2c3...`
- Full key hashed with SHA-256 before storage

## Middleware

**`requireSdkHeader`**: Returns 400 if `X-Drawhaus-Client` header is missing or empty. Header value is not validated — any non-empty string accepted.

**`requireApiKey`**: Extracts `Bearer <token>` from `Authorization` header. Hashes token with SHA-256, looks up `api_keys` by hash. Returns 401 if not found, expired, or revoked. Attaches `authUser` + `apiKeyWorkspaceId` to request. Updates `last_used_at` (debounced, not on every request — update if null or older than 1 minute).

**`logApiRequest`**: After response, logs key_id, method, path, status_code, IP, user-agent to `api_request_logs`. Fire-and-forget (don't block response).

## API Key Management Endpoints

Under existing `/api/` (session auth, for the dashboard UI):

- `GET /api/api-keys` — list keys for current user (returns: id, name, workspace, prefix, last_used, expires, created)
- `POST /api/api-keys` — create key (body: name, workspaceId, expiresAt?) → returns full key once
- `DELETE /api/api-keys/:id` — revoke key (sets revoked_at, does not delete row)

## Frontend

New tab in Settings page: "API Keys" (between Integrations and Preferences).

- **List view**: Table with name, workspace name, prefix (`dhk_a1b2...`), last used, expires, status (active/expired/revoked), revoke button
- **Create modal**: Name input, workspace selector (dropdown of user's workspaces), optional expiration date, create button
- **Post-create**: Show full key in monospace with copy button + warning "This key won't be shown again"
- **Empty state**: Explain what API keys are for, link to API docs
- **Usage stats**: Last used timestamp per key

## Limits

- Max 10 active keys per user (prevent abuse)
- Key name max 100 chars
- Revoked keys kept in DB for audit trail (prunable later)
- `api_request_logs` retained 30 days (cron or lazy cleanup)

## Files

- **Create**: `api-key.ts` (entity), `api-key-repository.ts` (port), `pg-api-key-repository.ts` (repo), `create-api-key.ts` / `list-api-keys.ts` / `revoke-api-key.ts` / `validate-api-key.ts` (use cases), `require-api-key.ts` / `require-sdk-header.ts` / `log-api-request.ts` (middleware), `api-key.routes.ts` (management routes), `ApiKeysSettings.tsx` (frontend component), migration file
- **Modify**: `composition/repositories.ts`, `composition/use-cases.ts`, `main.ts` (mount routes + middleware), `Settings.tsx` (add tab), `api/` frontend (new api-keys API client)

## Panel Notes

- Nadia: SHA-256 hash, not bcrypt — keys are high-entropy, don't need slow hashing. Prefix for leak scanning is non-negotiable
- Rafa: `last_used_at` update debounced to avoid write amplification. Request log insert is fire-and-forget
- Leo: post-create UX is critical — user must understand the key won't be shown again. Copy button with visual confirmation
- Iris: index on `key_hash` for O(1) lookup on every `/v1/` request. Log retention needs a cleanup mechanism
